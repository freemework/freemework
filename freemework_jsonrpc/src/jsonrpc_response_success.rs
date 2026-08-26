use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct JsonRpcResponseSuccessMessage {
    #[serde(flatten)]
    version: super::jsonrpc_version::JsonRpcVersion,

    pub result: serde_json::Value,

    pub id: Option<Value>,
}

impl JsonRpcResponseSuccessMessage {
    pub fn new(result: serde_json::Value, id: Option<serde_json::Value>) -> Self {
        Self {
            version: super::jsonrpc_version::JsonRpcVersion::default(),
            result,
            id,
        }
    }
}

impl TryFrom<&[u8]> for JsonRpcResponseSuccessMessage {
    type Error = serde_json::Error;

    fn try_from(bytes: &[u8]) -> Result<Self, Self::Error> {
        serde_json::from_slice(bytes)
    }
}

impl TryFrom<&str> for JsonRpcResponseSuccessMessage {
    type Error = serde_json::Error;

    fn try_from(json_text: &str) -> Result<Self, Self::Error> {
        serde_json::from_str(json_text)
    }
}

impl TryInto<Vec<u8>> for JsonRpcResponseSuccessMessage {
    type Error = serde_json::Error;

    fn try_into(self) -> Result<Vec<u8>, Self::Error> {
        serde_json::to_vec(&self)
    }
}

impl TryInto<String> for JsonRpcResponseSuccessMessage {
    type Error = serde_json::Error;

    fn try_into(self) -> Result<String, Self::Error> {
        serde_json::to_string_pretty(&self)
    }
}
