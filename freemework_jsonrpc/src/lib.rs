mod jsonrpc_request;
mod jsonrpc_response_error;
mod jsonrpc_response_success;
mod jsonrpc_version;

pub use self::jsonrpc_request::*;
pub use self::jsonrpc_response_error::*;
pub use self::jsonrpc_response_success::*;

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum JsonRpcMessage {
    JsonRpcRequest(JsonRpcRequestMessage),
    JsonRpcResponse(JsonRpcResponseMessage),
}

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum JsonRpcResponseMessage {
    JsonRpcResponseError(JsonRpcResponseErrorMessage),
    JsonRpcResponseSuccess(JsonRpcResponseSuccessMessage),
}
impl JsonRpcResponseMessage {
    pub fn id(&self) -> &Option<serde_json::Value> {
        match self {
            JsonRpcResponseMessage::JsonRpcResponseError(msg) => &msg.id,
            JsonRpcResponseMessage::JsonRpcResponseSuccess(msg) => &msg.id,
        }
    }
}



#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn test_serialize_json_request_1() {
        let msg = JsonRpcMessage::JsonRpcRequest(JsonRpcRequestMessage::new(
            "wireguard.create",
            Some(json!({
              "endpointPort": 1234,
              "tunnelIP": "10.2.2.1",
              "peers": [
                {
                  "publicKey": "966RMYoSqvzauLnzwEXBGokD8k6Wfh3fZUq5Hhuyh2q4",
                  "endpoint": "5.6.7.8:5678",
                  "tunnelIPs": ["10.3.4.5"]
                }
              ]
            })),
            Some(serde_json::Value::String("1".to_string())),
        ));

        let response_bytes_result = serde_json::to_vec(&msg);
        assert!(response_bytes_result.is_ok());
        let response_bytes: Vec<u8> = response_bytes_result.unwrap();

        let msg_json_option = String::from_utf8(response_bytes);
        assert!(msg_json_option.is_ok());
        let msg_json: String = msg_json_option.unwrap();
        assert_eq!(
            msg_json,
            "{\"jsonrpc\":\"2.0\",\"method\":\"wireguard.create\",\"params\":{\"endpointPort\":1234,\"tunnelIP\":\"10.2.2.1\",\"peers\":[{\"publicKey\":\"966RMYoSqvzauLnzwEXBGokD8k6Wfh3fZUq5Hhuyh2q4\",\"endpoint\":\"5.6.7.8:5678\",\"tunnelIPs\":[\"10.3.4.5\"]}]},\"id\":\"1\"}"
        );
    }

    #[test]
    fn test_serialize_json_request_2() {
        let msg = JsonRpcMessage::JsonRpcRequest(JsonRpcRequestMessage::new(
            "wireguard.delete",
            Some(json!({
              "endpointPort": 51280
            })),
            Some(serde_json::Value::String("2".to_string())),
        ));

        let response_bytes_result = serde_json::to_vec(&msg);
        assert!(response_bytes_result.is_ok());
        let response_bytes: Vec<u8> = response_bytes_result.unwrap();

        let msg_json_option = String::from_utf8(response_bytes);
        assert!(msg_json_option.is_ok());
        let msg_json: String = msg_json_option.unwrap();
        assert_eq!(
            msg_json,
            "{\"jsonrpc\":\"2.0\",\"method\":\"wireguard.delete\",\"params\":{\"endpointPort\":51280},\"id\":\"2\"}"
        );
    }

    #[test]
    fn test_serialize_json_response_success_1() {
        let msg = JsonRpcMessage::JsonRpcResponse(JsonRpcResponseMessage::JsonRpcResponseSuccess(
            JsonRpcResponseSuccessMessage::new(
                json!("wg7"),
                Some(serde_json::Value::String("1".to_string())),
            ),
        ));

        let response_bytes_result = serde_json::to_vec(&msg);
        assert!(response_bytes_result.is_ok());
        let response_bytes: Vec<u8> = response_bytes_result.unwrap();

        let msg_json_option = String::from_utf8(response_bytes);
        assert!(msg_json_option.is_ok());
        let msg_json: String = msg_json_option.unwrap();
        assert_eq!(
            msg_json,
            "{\"jsonrpc\":\"2.0\",\"result\":\"wg7\",\"id\":\"1\"}"
        );
    }

    #[test]
    fn test_serialize_json_response_error_1() {
        let msg = JsonRpcMessage::JsonRpcResponse(JsonRpcResponseMessage::JsonRpcResponseError(
            JsonRpcResponseErrorMessage::new(
                JsonRpcErrorCode::InternalError.to_json_rpc_error(),
                Some(serde_json::Value::String("1".to_string())),
            ),
        ));

        let response_bytes_result = serde_json::to_vec(&msg);
        assert!(response_bytes_result.is_ok());
        let response_bytes: Vec<u8> = response_bytes_result.unwrap();

        let msg_json_option = String::from_utf8(response_bytes);
        assert!(msg_json_option.is_ok());
        let msg_json: String = msg_json_option.unwrap();
        assert_eq!(
            msg_json,
            "{\"jsonrpc\":\"2.0\",\"error\":{\"code\":-32603,\"message\":\"Internal error\"},\"id\":\"1\"}"
        );
    }
}
