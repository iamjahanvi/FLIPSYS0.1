export interface Config {
  flipSpeed: number; // in seconds
  isHardCover: boolean;
  useSound: boolean;
  shadowIntensity: number; // 0-100
  scale: number;
}

export const DefaultConfig: Config = {
  flipSpeed: 1000, // ms
  isHardCover: true,
  useSound: true,
  shadowIntensity: 32,
  scale: 1,
};

export interface PageState {
  pageNumber: number;
  rotation: number;
}

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))}${sizes[i]}`;
};