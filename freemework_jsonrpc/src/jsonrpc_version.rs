use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(crate) struct JsonRpcVersion {
    #[serde(deserialize_with = "deserialize_jsonrpc")]
    jsonrpc: String,
}

impl Default for JsonRpcVersion {
    fn default() -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
        }
    }
}

fn deserialize_jsonrpc<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let v = String::deserialize(deserializer)?;
    if v == "2.0" {
        Ok(v)
    } else {
        Err(serde::de::Error::custom("jsonrpc must be 2.0"))
    }
}
