const text = '"playable_url_quality_hd":"https:\\/\\/video.fbcdn.net\\/v\\/t42.1790-2\\/1234.mp4"';
const hdMatch = text.match(/"playable_url_quality_hd"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
console.log("Matched:", hdMatch[1]);
console.log("Unescaped:", JSON.parse('"' + hdMatch[1] + '"'));
