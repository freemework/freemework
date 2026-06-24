use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct JsonRpcRequestMessage {
    #[serde(flatten)]
    version: super::jsonrpc_version::JsonRpcVersion,

    pub method: String,

    pub params: Option<serde_json::Value>,

    pub id: Option<serde_json::Value>,
}

impl JsonRpcRequestMessage {
    pub fn new(
        method: &str,
        params: Option<serde_json::Value>,
        id: Option<serde_json::Value>,
    ) -> Self {
        Self {
            version: super::jsonrpc_version::JsonRpcVersion::default(),
            method: method.to_string(),
            params,
            id,
        }
    }
}
