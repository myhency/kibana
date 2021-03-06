/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useReducer } from 'react';
import { errorToToaster, useStateToaster } from '../../components/toasters';
import * as i18n from './translations';
import { patchCasesStatus } from './api';
import { BulkUpdateStatus, Case } from './types';

interface UpdateState {
  isUpdated: boolean;
  isLoading: boolean;
  isError: boolean;
}
type Action =
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS'; payload: boolean }
  | { type: 'FETCH_FAILURE' }
  | { type: 'RESET_IS_UPDATED' };

const dataFetchReducer = (state: UpdateState, action: Action): UpdateState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        isUpdated: action.payload,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    case 'RESET_IS_UPDATED':
      return {
        ...state,
        isUpdated: false,
      };
    default:
      return state;
  }
};
interface UseUpdateCase extends UpdateState {
  updateBulkStatus: (cases: Case[], status: string) => void;
  dispatchResetIsUpdated: () => void;
}

export const useUpdateCases = (): UseUpdateCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    isUpdated: false,
  });
  const [, dispatchToaster] = useStateToaster();

  const dispatchUpdateCases = useCallback((cases: BulkUpdateStatus[]) => {
    let cancel = false;
    const abortCtrl = new AbortController();

    const patchData = async () => {
      try {
        dispatch({ type: 'FETCH_INIT' });
        await patchCasesStatus(cases, abortCtrl.signal);
        if (!cancel) {
          dispatch({ type: 'FETCH_SUCCESS', payload: true });
        }
      } catch (error) {
        if (!cancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
    };
    patchData();
    return () => {
      cancel = true;
      abortCtrl.abort();
    };
  }, []);

  const dispatchResetIsUpdated = useCallback(() => {
    dispatch({ type: 'RESET_IS_UPDATED' });
  }, []);

  const updateBulkStatus = useCallback((cases: Case[], status: string) => {
    const updateCasesStatus: BulkUpdateStatus[] = cases.map(theCase => ({
      status,
      id: theCase.id,
      version: theCase.version,
    }));
    dispatchUpdateCases(updateCasesStatus);
  }, []);
  return { ...state, updateBulkStatus, dispatchResetIsUpdated };
};
