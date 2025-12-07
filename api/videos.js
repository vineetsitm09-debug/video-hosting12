export default async function handler(req, res) {
  const backendUrl = "http://18.218.164.106:5000/videos";

  try {
    const response = await fetch(backendUrl);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch backend" });
  }
}
