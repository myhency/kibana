/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { PhraseFilter } from '../../../../../../../src/plugins/data/public';

export interface ITooltipProperty {
  getPropertyKey(): string;
  getPropertyName(): string;
  getHtmlDisplayValue(): string;
  getRawValue(): string | undefined;
  isFilterable(): boolean;
  getESFilters(): Promise<PhraseFilter[]>;
}

export interface MapFeature {
  id: number;
  layerId: string;
}

export interface LoadFeatureProps {
  layerId: string;
  featureId: number;
}

export interface FeatureGeometry {
  coordinates: [number];
  type: string;
}

export interface RenderTooltipContentParams {
  addFilters(filter: object): void;
  closeTooltip(): void;
  features: MapFeature[];
  isLocked: boolean;
  getLayerName(layerId: string): Promise<string>;
  loadFeatureProperties({ layerId, featureId }: LoadFeatureProps): Promise<ITooltipProperty[]>;
  loadFeatureGeometry({ layerId, featureId }: LoadFeatureProps): FeatureGeometry;
}

export type RenderToolTipContent = (params: RenderTooltipContentParams) => JSX.Element;

export class TooltipProperty implements ITooltipProperty {
  private readonly _propertyKey: string;
  private readonly _rawValue: string | undefined;
  private readonly _propertyName: string;

  constructor(propertyKey: string, propertyName: string, rawValue: string | undefined) {
    this._propertyKey = propertyKey;
    this._propertyName = propertyName;
    this._rawValue = rawValue;
  }

  getPropertyKey(): string {
    return this._propertyKey;
  }

  getPropertyName(): string {
    return this._propertyName;
  }

  getHtmlDisplayValue(): string {
    return _.escape(this._rawValue);
  }

  getRawValue(): string | undefined {
    return this._rawValue;
  }

  isFilterable(): boolean {
    return false;
  }

  async getESFilters(): Promise<PhraseFilter[]> {
    return [];
  }
}
