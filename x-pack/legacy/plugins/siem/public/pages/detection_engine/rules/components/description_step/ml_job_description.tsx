/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';

import { useKibana } from '../../../../../lib/kibana';
import { SiemJob } from '../../../../../components/ml_popover/types';
import { ListItems } from './types';
import { isJobStarted } from '../../../../../components/ml/helpers';
import { ML_JOB_STARTED, ML_JOB_STOPPED } from './translations';

enum MessageLevels {
  info = 'info',
  warning = 'warning',
  error = 'error',
}

const AuditIcon: React.FC<{
  message: SiemJob['auditMessage'];
}> = ({ message }) => {
  if (!message) {
    return null;
  }

  let color = 'primary';
  let icon = 'alert';

  if (message.level === MessageLevels.info) {
    icon = 'iInCircle';
  } else if (message.level === MessageLevels.warning) {
    color = 'warning';
  } else if (message.level === MessageLevels.error) {
    color = 'danger';
  }

  return (
    <EuiToolTip content={message.text}>
      <EuiIcon type={icon} color={color} />
    </EuiToolTip>
  );
};

export const JobStatusBadge: React.FC<{ job: SiemJob }> = ({ job }) => {
  const isStarted = isJobStarted(job.jobState, job.datafeedState);
  const color = isStarted ? 'secondary' : 'danger';
  const text = isStarted ? ML_JOB_STARTED : ML_JOB_STOPPED;

  return (
    <EuiBadge data-test-subj="machineLearningJobStatus" color={color}>
      {text}
    </EuiBadge>
  );
};

const JobLink = styled(EuiLink)`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

const Wrapper = styled.div`
  overflow: hidden;
`;

export const MlJobDescription: React.FC<{ job: SiemJob }> = ({ job }) => {
  const jobUrl = useKibana().services.application.getUrlForApp('ml#/jobs');

  return (
    <Wrapper>
      <div>
        <JobLink data-test-subj="machineLearningJobId" href={jobUrl} target="_blank">
          {job.id}
        </JobLink>
        <AuditIcon message={job.auditMessage} />
      </div>
      <JobStatusBadge job={job} />
    </Wrapper>
  );
};

export const buildMlJobDescription = (
  jobId: string,
  label: string,
  siemJobs: SiemJob[]
): ListItems => {
  const siemJob = siemJobs.find(job => job.id === jobId);

  return {
    title: label,
    description: siemJob ? <MlJobDescription job={siemJob} /> : jobId,
  };
};
