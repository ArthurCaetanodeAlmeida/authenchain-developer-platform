// Server embedding has no dependency on the desktop OAuth credential store.
export { loadMcpConfig, validateMcpBaseUrl } from './config.js'
export type { AuthenChainMcpConfig, ConfirmationReplayStore, McpCredentialKind, McpProfile, MutationApprovalStore } from './config.js'
export { ConfirmationTokenStore } from './confirmation.js'
export { createAuthenChainMcpServer, AUTHENCHAIN_MCP_VERSION } from './server.js'
export { MCP_ERROR_SCHEMA_VERSION, MCP_RESULT_SCHEMA_VERSION, mcpResultSchema } from './results.js'
