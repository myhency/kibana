/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';
import { ESSearchResponse } from '../../../typings/elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_DURATION
} from '../../../common/elasticsearch_fieldnames';
import { AlertingPlugin } from '../../../../alerting/server';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { APMConfig } from '../..';

interface RegisterAlertParams {
  alerting: AlertingPlugin['setup'];
  config$: Observable<APMConfig>;
}

const paramsSchema = schema.object({
  serviceName: schema.string(),
  transactionType: schema.string(),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  aggregationType: schema.oneOf([
    schema.literal('avg'),
    schema.literal('95th'),
    schema.literal('99th')
  ])
});

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.TransactionDuration];

export function registerTransactionDurationAlertType({
  alerting,
  config$
}: RegisterAlertParams) {
  alerting.registerType({
    id: AlertType.TransactionDuration,
    name: alertTypeConfig.name,
    actionGroups: alertTypeConfig.actionGroups,
    defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
    validate: {
      params: paramsSchema
    },

    executor: async ({ services, params }) => {
      const config = await config$.pipe(take(1)).toPromise();

      const alertParams = params as TypeOf<typeof paramsSchema>;

      const indices = await getApmIndices({
        config,
        savedObjectsClient: services.savedObjectsClient
      });

      const searchParams = {
        index: indices['apm_oss.transactionIndices'],
        size: 0,
        body: {
          query: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: `now-${alertParams.windowSize}${alertParams.windowUnit}`
                    }
                  }
                },
                {
                  term: {
                    [PROCESSOR_EVENT]: 'transaction'
                  }
                },
                {
                  term: {
                    [SERVICE_NAME]: alertParams.serviceName
                  }
                },
                {
                  term: {
                    [TRANSACTION_TYPE]: alertParams.transactionType
                  }
                }
              ]
            }
          },
          aggs: {
            agg:
              alertParams.aggregationType === 'avg'
                ? {
                    avg: {
                      field: TRANSACTION_DURATION
                    }
                  }
                : {
                    percentiles: {
                      field: TRANSACTION_DURATION,
                      percents: [
                        alertParams.aggregationType === '95th' ? 95 : 99
                      ]
                    }
                  }
          }
        }
      };

      const response: ESSearchResponse<
        unknown,
        typeof searchParams
      > = await services.callCluster('search', searchParams);

      if (!response.aggregations) {
        return;
      }

      const { agg } = response.aggregations;

      const value = 'values' in agg ? agg.values[0] : agg.value;

      if (value && value > alertParams.threshold * 1000) {
        const alertInstance = services.alertInstanceFactory(
          AlertType.TransactionDuration
        );
        alertInstance.scheduleActions(alertTypeConfig.defaultActionGroupId);
      }

      return {};
    }
  });
}
