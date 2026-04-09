export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const data = request.body;
  const token = process.env.HF_TOKEN;

  if (!token) {
    return response.status(500).json({ error: 'Hugging Face token not configured on server' });
  }

  try {
    const res = await fetch(
      "https://router.huggingface.co/nscale/v1/images/generations",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    const result = await res.json();
    return response.status(res.status).json(result);
  } catch (error) {
    console.error("Image Proxy Error:", error);
    return response.status(500).json({ error: 'Failed to generate image' });
  }
}
