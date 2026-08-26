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

impl TryFrom<&[u8]> for JsonRpcRequestMessage {
    type Error = serde_json::Error;

    fn try_from(bytes: &[u8]) -> Result<Self, Self::Error> {
        serde_json::from_slice(bytes)
    }
}

impl TryFrom<&str> for JsonRpcRequestMessage {
    type Error = serde_json::Error;

    fn try_from(json_text: &str) -> Result<Self, Self::Error> {
        serde_json::from_str(json_text)
    }
}

impl TryInto<Vec<u8>> for JsonRpcRequestMessage {
    type Error = serde_json::Error;

    fn try_into(self) -> Result<Vec<u8>, Self::Error> {
        serde_json::to_vec(&self)
    }
}

impl TryInto<String> for JsonRpcRequestMessage {
    type Error = serde_json::Error;

    fn try_into(self) -> Result<String, Self::Error> {
        serde_json::to_string_pretty(&self)
    }
}
