export {
  TrustScorer,
  DEFAULT_WEIGHTS,
  DOMAIN_HALF_LIFE,
  TrustAxesSchema,
  SourceTypeSchema,
  ClaimSchema,
  TrustResultSchema,
} from "./TrustScorer";
export type { TrustAxes, SourceType, Claim, TrustResult, TrustWeights } from "./TrustScorer";

export {
  ConsensusEngine,
  RuleBasedTrustAgent,
  LLMTrustAgent,
  MockTrustAgent,
  AgentVerdictSchema,
  DissentSchema,
  ConsensusResultSchema,
} from "./ConsensusEngine";
export type {
  TrustAgent,
  LLMTrustAdapter,
  ConsensusConfig,
  AgentVerdict,
  Dissent,
  ConsensusResult,
} from "./ConsensusEngine";
