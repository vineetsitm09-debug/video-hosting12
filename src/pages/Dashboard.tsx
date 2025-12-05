import React, { useEffect, useState } from "react";

export default function Dashboard() {
  const [videos, setVideos] = useState([]);

  const fetchVideos = async () => {
    const res = await fetch("http://18.218.164.106:5000/videos");
    const data = await res.json();
    setVideos(data);
  };

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Your Videos</h1>

      {videos.length === 0 ? (
        <p className="text-gray-400">No videos uploaded yet.</p>
      ) : (
        <table className="min-w-full border border-gray-800 text-left text-gray-300">
          <thead className="bg-[#1a1a1a] text-gray-400 uppercase text-sm">
            <tr>
              <th className="p-3">Thumbnail</th>
              <th className="p-3">Title</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v: any) => (
              <tr key={v.id} className="border-t border-gray-800 hover:bg-[#202020]">
                <td className="p-3">
                  <img
                    src={v.thumbnail}
                    alt="thumb"
                    className="w-32 h-20 object-cover rounded"
                  />
                </td>
                <td className="p-3">{v.title}</td>
                <td className="p-3 capitalize text-green-400">{v.status}</td>
                <td className="p-3 text-gray-400">
                  {new Date(v.created_at).toLocaleString()}
                </td>
                <td className="p-3">
                  <a
                    href={v.url}
                    target="_blank"
                    className="text-red-400 hover:underline"
                  >
                    Watch
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
