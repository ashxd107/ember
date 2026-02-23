const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

async function request(path: string, method: string = 'GET', body?: any) {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}/api${path}`, opts);
  return res.json();
}

export const api = {
  get: (path: string) => request(path, 'GET'),
  post: (path: string, body?: any) => request(path, 'POST', body),
  put: (path: string, body: any) => request(path, 'PUT', body),
};
