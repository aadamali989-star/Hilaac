interface ApiRequest {
  method?: string;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
}

export default function handler(_req: ApiRequest, res: ApiResponse) {
  res.status(200).json({ ok: true, service: 'hilaac-health-study-suite' });
}
