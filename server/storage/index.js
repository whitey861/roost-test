import { SimulatedWasabiProvider } from './SimulatedWasabiProvider.js';
import { WasabiS3Provider } from './WasabiS3Provider.js';

export function createStorageProvider() {
  const provider = process.env.STORAGE_PROVIDER || 'simulated';

  if (provider === 'wasabi') {
    return new WasabiS3Provider();
  }

  const storagePath = process.env.SIMULATED_STORAGE_PATH || './simulated_storage';
  return new SimulatedWasabiProvider(storagePath);
}
