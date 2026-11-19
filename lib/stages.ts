export const STAGES = ['lead', 'trial', 'active', 'at_risk', 'churned'] as const
export const STAGE_LABEL: Record<string, string> = { lead: 'Lead', trial: 'Trial', active: 'Active', at_risk: 'At risk', churned: 'Churned' }
