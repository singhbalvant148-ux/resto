import { PrinterStatus } from '../types/pos';

// Known thermal printer BLE GATT Service UUIDs
const THERMAL_PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common 18F0
  '0000ff00-0000-1000-8000-00805f9b34fb', // Common FF00
  '0000fee7-0000-1000-8000-00805f9b34fb', // WeChat / Tencent standard POS
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent serial
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // PosBank / Xprinter
  '0000af30-0000-1000-8000-00805f9b34fb', // Citizen / Star
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000e0ff-0000-1000-8000-00805f9b34fb',
  '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
  '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
  '0000180a-0000-1000-8000-00805f9b34fb', // Device Info
];

type StatusListener = (status: PrinterStatus, deviceName: string | null, error?: string | null) => void;

class BluetoothPrinterService {
  private device: any = null;
  private server: any = null;
  private writeCharacteristic: any = null;
  private status: PrinterStatus = 'disconnected';
  private deviceName: string | null = null;
  private lastError: string | null = null;
  private listeners: Set<StatusListener> = new Set();

  constructor() {
    // Restore saved device name from localStorage if available
    try {
      this.deviceName = localStorage.getItem('pos_bt_printer_name');
    } catch {
      // ignore
    }
  }

  /**
   * Check if the current browser environment supports the Web Bluetooth API
   */
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Check if browser is running on Chrome or Microsoft Edge
   */
  isCompatibleBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isChromium = ua.includes('Chrome') || ua.includes('Edg/');
    return isChromium && this.isSupported();
  }

  /**
   * Current connection status
   */
  getStatus(): PrinterStatus {
    return this.status;
  }

  /**
   * Current device name
   */
  getDeviceName(): string | null {
    return this.deviceName;
  }

  /**
   * Last error description
   */
  getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Subscribe to connection status changes
   */
  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    // Emit immediate current state
    listener(this.status, this.deviceName, this.lastError);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.status, this.deviceName, this.lastError));
  }

  private setStatus(status: PrinterStatus, error: string | null = null) {
    this.status = status;
    this.lastError = error;
    this.notify();
  }

  /**
   * Connect to a Bluetooth thermal printer using Web Bluetooth API
   */
  async connect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isSupported()) {
      const err =
        'Web Bluetooth API is not supported in this browser. Please use Google Chrome or Microsoft Edge on Windows 10/11.';
      this.setStatus('error', err);
      return { success: false, error: err };
    }

    try {
      this.setStatus('connecting', null);

      // Prompt user to pick Bluetooth device
      // Request acceptAllDevices with optionalServices to find any thermal printer
      const navBt = (navigator as any).bluetooth;
      const device = await navBt.requestDevice({
        acceptAllDevices: true,
        optionalServices: THERMAL_PRINTER_SERVICE_UUIDS,
      });

      if (!device) {
        throw new Error('No device selected.');
      }

      this.device = device;
      this.deviceName = device.name || 'Bluetooth Thermal Printer';
      try {
        if (this.deviceName) {
          localStorage.setItem('pos_bt_printer_name', this.deviceName);
        }
      } catch {
        // ignore
      }

      // Attach disconnection listener
      device.addEventListener('gattserverdisconnected', () => {
        this.writeCharacteristic = null;
        this.server = null;
        this.setStatus('disconnected', null);
      });

      // Connect to GATT Server
      const server = await device.gatt.connect();
      this.server = server;

      // Locate writable characteristic
      const writeChar = await this.findWriteCharacteristic(server);

      if (!writeChar) {
        throw new Error(
          'Connected to device, but could not find a writable thermal printer GATT characteristic. If this printer uses Bluetooth Classic (Serial Port Profile / SPP), please pair it in Windows Bluetooth Settings and use the "Windows Printer Driver" option.'
        );
      }

      this.writeCharacteristic = writeChar;
      this.setStatus('connected', null);

      return { success: true, deviceName: this.deviceName || undefined };
    } catch (err: any) {
      this.writeCharacteristic = null;
      this.server = null;

      let userMsg = err?.message || 'Bluetooth connection failed.';

      // Friendly mapping of common Web Bluetooth exceptions
      if (err.name === 'NotFoundError' || userMsg.includes('cancelled') || userMsg.includes('User cancelled')) {
        userMsg = 'Bluetooth device selection was cancelled.';
        this.setStatus('disconnected', null);
        return { success: false, error: userMsg };
      }

      if (err.name === 'SecurityError' || userMsg.includes('gesture')) {
        userMsg = 'Bluetooth connection must be initiated by a user click.';
      } else if (userMsg.includes('Bluetooth adapter not available') || userMsg.includes('powered off')) {
        userMsg = 'Bluetooth is turned off or unavailable on this Windows PC. Please turn on Bluetooth in Windows Settings.';
      }

      this.setStatus('error', userMsg);
      return { success: false, error: userMsg };
    }
  }

  /**
   * Disconnect the current Bluetooth printer
   */
  disconnect() {
    try {
      if (this.device?.gatt?.connected) {
        this.device.gatt.disconnect();
      }
    } catch (e) {
      console.warn('Error during disconnect:', e);
    }

    this.writeCharacteristic = null;
    this.server = null;
    this.setStatus('disconnected', null);
  }

  /**
   * Attempt to reconnect to previously selected device
   */
  async reconnect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (this.device?.gatt) {
      try {
        this.setStatus('connecting', null);
        const server = await this.device.gatt.connect();
        this.server = server;
        const writeChar = await this.findWriteCharacteristic(server);
        if (!writeChar) {
          throw new Error('Writable characteristic not found on reconnect.');
        }
        this.writeCharacteristic = writeChar;
        this.setStatus('connected', null);
        return { success: true, deviceName: this.deviceName || 'Printer' };
      } catch (err: any) {
        return this.connect(); // Fallback to prompt
      }
    }
    return this.connect();
  }

  /**
   * Search for a writable GATT characteristic on the connected server
   */
  private async findWriteCharacteristic(server: any): Promise<any> {
    try {
      // 1. First search known thermal printer service UUIDs
      for (const serviceUuid of THERMAL_PRINTER_SERVICE_UUIDS) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              return char;
            }
          }
        } catch {
          // service not present on this device, continue searching
        }
      }

      // 2. Fallback: inspect all exposed primary services
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                return char;
              }
            }
          } catch {
            // continue
          }
        }
      } catch {
        // continue
      }
    } catch (e) {
      console.warn('Error discovering GATT services:', e);
    }
    return null;
  }

  /**
   * Send ESC/POS byte array to the Bluetooth printer with MTU packet chunking
   */
  async printBytes(bytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
    if (this.status !== 'connected' || !this.writeCharacteristic) {
      return {
        success: false,
        error: 'Printer is not connected. Please connect your Bluetooth printer first.',
      };
    }

    try {
      // Bluetooth Low Energy characteristic writes typically limit payload to 50-100 bytes (MTU)
      const CHUNK_SIZE = 64;
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
        const chunk = bytes.slice(offset, offset + CHUNK_SIZE);

        if (this.writeCharacteristic.writeValueWithoutResponse) {
          await this.writeCharacteristic.writeValueWithoutResponse(chunk);
        } else if (this.writeCharacteristic.writeValue) {
          await this.writeCharacteristic.writeValue(chunk);
        } else {
          throw new Error('Selected characteristic does not support write operations.');
        }

        // 20ms pause between chunks to avoid thermal printer buffer overrun
        if (offset + CHUNK_SIZE < bytes.length) {
          await delay(20);
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Print transmission error:', err);
      const errMsg = err?.message || 'Failed to transmit print data to Bluetooth printer.';
      // Check if disconnected
      if (!this.device?.gatt?.connected) {
        this.setStatus('disconnected', 'Printer disconnected unexpectedly during transmission.');
      } else {
        this.setStatus('error', errMsg);
      }
      return { success: false, error: errMsg };
    }
  }
}

export const bluetoothPrinter = new BluetoothPrinterService();
