package slack

import "encoding/json"

// marshalBlocks serializes Block Kit blocks to the JSON representation
// Slack expects on chat.postMessage (form POST with a "blocks" parameter).
func marshalBlocks(blocks []Block) (string, error) {
	buf, err := json.Marshal(blocks)
	if err != nil {
		return "", err
	}
	return string(buf), nil
}
