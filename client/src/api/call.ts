import api from "./axios";

export interface IceServerConfig {
  iceServers: RTCIceServer[];
}

export const fetchIceServers = async (token: string): Promise<RTCIceServer[]> => {
  const res = await api.get<IceServerConfig>("/api/calls/ice-servers", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.iceServers || [];
};
