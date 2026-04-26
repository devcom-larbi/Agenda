const fetch = require('node-fetch');

(async () => {
  const rs = await fetch('http://localhost:5173/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          "role": "system",
          "content": "Tu es Tempo... INTERDIT: poser des questions. Heure non précisée: 'A définir'. Jour non précisé: aujourd'hui. APPELLEMENT."
        },
        {"role": "user", "content": "Je veux ajouter un rendez-vous."}
      ],
      tools: [{"type": "function", "function": {"name": "manage_blocks", "description": "...", "parameters": {"type": "object", "properties": {"action": {"type":"string"}, "target_days": {"type": "array", "items": {"type": "string"}}}, "required": ["action", "target_days"]}}}],
      model: "openai/gpt-oss-120b"
    })
  });
  console.log(await rs.text());
})();
