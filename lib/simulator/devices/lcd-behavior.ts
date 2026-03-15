/**
 * LCD Display Behavior (16x2 I2C)
 * 
 * This device simulates an LCD display with I2C communication.
 * It responds to I2C writes and displays text realistically.
 */

import { DeviceBehavior, DeviceRegistry } from '../device-driven-simulator';
import type { Board } from '@/types';

export class LCDBehavior implements DeviceBehavior {
  public deviceId = '';
  public deviceType = 'lcd1602';
  public category = 'display' as const;
  
  private sdaPin = 18;
  private sclPin = 19;
  private i2cAddress = 0x27;
  private lines = ['', ''];
  private cursor = { line: 0, column: 0 };
  private backlight = true;
  private displayOn = true;
  private cursorVisible = true;
  private blink = false;
  
  initialize(board: Board, pinMapping: Record<string, number>) {
    this.sdaPin = pinMapping['SDA'] || 18;
    this.sclPin = pinMapping['SCL'] || 19;
    this.i2cAddress = pinMapping['address'] || 0x27;
    
    // Initialize with welcome message
    this.lines[0] = 'Arduino Simulator';
    this.lines[1] = 'LCD Ready';
  }
  
  tick(millis: number, deltaTime: number) {
    // LCD doesn't need continuous ticking
    // Could implement cursor blinking here if needed
  }
  
  handleArduinoCall(functionName: string, args: any[]): any {
    switch (functionName) {
      case 'i2cWrite':
        return this.handleI2CWrite(args[0], args[1]); // address, data
      case 'i2cRead':
        return this.handleI2CRead(args[0]); // address
      case 'print':
        return this.print(args[0]); // text
      case 'println':
        return this.println(args[0]); // text
      case 'clear':
        return this.clear();
      case 'setCursor':
        return this.setCursor(args[0], args[1]); // column, line
      case 'backlight':
        return this.setBacklight(args[0]); // on/off
      default:
        return undefined;
    }
  }
  
  getState(): Record<string, any> {
    return {
      line1: this.lines[0],
      line2: this.lines[1],
      cursor: { ...this.cursor },
      backlight: this.backlight,
      displayOn: this.displayOn,
      cursorVisible: this.cursorVisible,
      blink: this.blink,
      i2cAddress: `0x${this.i2cAddress.toString(16).toUpperCase()}`
    };
  }
  
  setState(state: Record<string, any>) {
    if (state.line1 !== undefined) this.lines[0] = state.line1;
    if (state.line2 !== undefined) this.lines[1] = state.line2;
    if (state.backlight !== undefined) this.backlight = Boolean(state.backlight);
  }
  
  cleanup() {
    // Clear display on cleanup
    this.clear();
    this.backlight = false;
  }
  
  private handleI2CWrite(address: number, data: number): boolean {
    if (address !== this.i2cAddress) return false;
    
    // Simplified LCD command handling
    // In reality, this would be more complex with LCD command parsing
    const command = data & 0xF0; // High nibble is command
    
    switch (command) {
      case 0x80: // Set DDRAM address
        this.cursor.line = (data & 0x40) ? 1 : 0;
        this.cursor.column = data & 0x3F;
        break;
      case 0x10: // Clear display
        this.clear();
        break;
      case 0x20: // Return home
        this.cursor = { line: 0, column: 0 };
        break;
      default:
        // Could be character data
        if (command >= 0x30) {
          this.writeChar(String.fromCharCode(data));
        }
    }
    
    return true;
  }
  
  private handleI2CRead(address: number): number {
    if (address !== this.i2cAddress) return 0xFF;
    
    // Return busy flag or other status
    return 0x00; // Not busy
  }
  
  private print(text: string) {
    for (const char of text) {
      this.writeChar(char);
    }
  }
  
  private println(text: string) {
    this.print(text);
    this.newLine();
  }
  
  private clear() {
    this.lines = ['', ''];
    this.cursor = { line: 0, column: 0 };
  }
  
  private setCursor(column: number, line: number) {
    this.cursor.column = Math.max(0, Math.min(15, column));
    this.cursor.line = Math.max(0, Math.min(1, line));
  }
  
  private setBacklight(on: boolean) {
    this.backlight = on;
  }
  
  private writeChar(char: string) {
    if (this.cursor.column >= 16) {
      this.newLine();
    }
    
    if (this.cursor.line < 2) {
      const line = this.lines[this.cursor.line];
      this.lines[this.cursor.line] = 
        line.substring(0, this.cursor.column) + char + line.substring(this.cursor.column + 1);
      this.cursor.column++;
    }
  }
  
  private newLine() {
    if (this.cursor.line === 0) {
      this.cursor.line = 1;
      this.cursor.column = 0;
    } else {
      // Scroll up
      this.lines[0] = this.lines[1];
      this.lines[1] = '';
      this.cursor.column = 0;
    }
  }
}

// Register the device behavior
DeviceRegistry.register('lcd1602', () => new LCDBehavior());
