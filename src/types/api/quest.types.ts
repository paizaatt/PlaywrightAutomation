export interface QuestStageCondition {
  type: string;
  label: string;
  required: number;
  current: number;
  met: boolean;
}

export interface QuestStage {
  id: string;
  stageOrder: number;
  name: string;
  description: string;
  status: string;
  conditions: QuestStageCondition[];
  allConditionsMet: boolean;
}

export type ApiQuestStagesResponse = QuestStage[];
