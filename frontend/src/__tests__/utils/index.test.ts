import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  isValidUrl,
  formatUrl,
  getDomainFromUrl,
  formatNumber,
  formatPercentage,
  truncateText,
  capitalizeFirst,
  slugify,
  validateEmail,
  validatePassword,
  copyToClipboard,
  getFromStorage,
  setToStorage,
  removeFromStorage,
  debounce,
  throttle,
  getRandomColor,
  hexToRgb,
  getErrorMessage,
  isMobile,
  isTablet,
  isDesktop,
  getDeviceType,
  getBrowserName,
} from '../../utils';

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
});

describe('Utils', () => {
  describe('Date utilities', () => {
    const testDate = '2024-01-15T10:30:00.000Z';

    describe('formatDate', () => {
      it('should format date with default format', () => {
        const result = formatDate(testDate);
        expect(result).toBe('Jan 15, 2024');
      });

      it('should format date with custom format', () => {
        const result = formatDate(testDate, 'yyyy-MM-dd');
        expect(result).toBe('2024-01-15');
      });

      it('should handle Date object', () => {
        const dateObj = new Date(testDate);
        const result = formatDate(dateObj);
        expect(result).toBe('Jan 15, 2024');
      });
    });

    describe('formatDateTime', () => {
      it('should format date and time', () => {
        const result = formatDateTime(testDate);
        expect(result).toBe('Jan 15, 2024 10:30');
      });
    });

    describe('formatRelativeTime', () => {
      it('should format relative time', () => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const result = formatRelativeTime(oneHourAgo);
        expect(result).toContain('ago');
      });
    });
  });

  describe('URL utilities', () => {
    describe('isValidUrl', () => {
      it('should validate correct URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('http://example.com')).toBe(true);
        expect(isValidUrl('https://subdomain.example.com/path')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false);
        expect(isValidUrl('example.com')).toBe(false);
        expect(isValidUrl('')).toBe(false);
      });
    });

    describe('formatUrl', () => {
      it('should add https to URLs without protocol', () => {
        expect(formatUrl('example.com')).toBe('https://example.com');
        expect(formatUrl('subdomain.example.com')).toBe('https://subdomain.example.com');
      });

      it('should not modify URLs with protocol', () => {
        expect(formatUrl('https://example.com')).toBe('https://example.com');
        expect(formatUrl('http://example.com')).toBe('http://example.com');
      });
    });

    describe('getDomainFromUrl', () => {
      it('should extract domain from URL', () => {
        expect(getDomainFromUrl('https://example.com/path')).toBe('example.com');
        expect(getDomainFromUrl('http://subdomain.example.com')).toBe('subdomain.example.com');
      });

      it('should return original string for invalid URLs', () => {
        expect(getDomainFromUrl('not-a-url')).toBe('not-a-url');
      });
    });
  });

  describe('Number utilities', () => {
    describe('formatNumber', () => {
      it('should format large numbers', () => {
        expect(formatNumber(1500000)).toBe('1.5M');
        expect(formatNumber(2500)).toBe('2.5K');
        expect(formatNumber(999)).toBe('999');
      });
    });

    describe('formatPercentage', () => {
      it('should calculate and format percentage', () => {
        expect(formatPercentage(25, 100)).toBe('25.0%');
        expect(formatPercentage(1, 3)).toBe('33.3%');
        expect(formatPercentage(0, 0)).toBe('0%');
      });
    });
  });

  describe('String utilities', () => {
    describe('truncateText', () => {
      it('should truncate long text', () => {
        const longText = 'This is a very long text that should be truncated';
        expect(truncateText(longText, 20)).toBe('This is a very long ...');
      });

      it('should not truncate short text', () => {
        const shortText = 'Short text';
        expect(truncateText(shortText, 20)).toBe('Short text');
      });
    });

    describe('capitalizeFirst', () => {
      it('should capitalize first letter', () => {
        expect(capitalizeFirst('hello')).toBe('Hello');
        expect(capitalizeFirst('HELLO')).toBe('HELLO');
        expect(capitalizeFirst('')).toBe('');
      });
    });

    describe('slugify', () => {
      it('should create URL-friendly slug', () => {
        expect(slugify('Hello World!')).toBe('hello-world');
        expect(slugify('Test@#$%^&*()String')).toBe('test-string');
        expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      });
    });
  });

  describe('Validation utilities', () => {
    describe('validateEmail', () => {
      it('should validate correct emails', () => {
        expect(validateEmail('test@example.com')).toBe(true);
        expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(validateEmail('invalid-email')).toBe(false);
        expect(validateEmail('test@')).toBe(false);
        expect(validateEmail('@example.com')).toBe(false);
      });
    });

    describe('validatePassword', () => {
      it('should validate strong passwords', () => {
        const result = validatePassword('StrongPassword123!');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject weak passwords', () => {
        const result = validatePassword('weak');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should provide specific error messages', () => {
        const result = validatePassword('password');
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
        expect(result.errors).toContain('Password must contain at least one number');
        expect(result.errors).toContain('Password must contain at least one special character');
      });
    });
  });

  describe('Clipboard utility', () => {
    describe('copyToClipboard', () => {
      it('should copy text to clipboard using modern API', async () => {
        const mockWriteText = jest.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
          clipboard: {
            writeText: mockWriteText,
          },
        });

        const result = await copyToClipboard('test text');

        expect(mockWriteText).toHaveBeenCalledWith('test text');
        expect(result).toBe(true);
      });

      it('should handle clipboard API errors', async () => {
        const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard error'));
        Object.assign(navigator, {
          clipboard: {
            writeText: mockWriteText,
          },
        });

        const result = await copyToClipboard('test text');

        expect(result).toBe(false);
      });
    });
  });

  describe('Storage utilities', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    describe('getFromStorage', () => {
      it('should get value from localStorage', () => {
        localStorage.setItem('test-key', JSON.stringify({ value: 'test' }));

        const result = getFromStorage('test-key', { value: 'default' });

        expect(result).toEqual({ value: 'test' });
      });

      it('should return default value when key does not exist', () => {
        const result = getFromStorage('non-existent-key', { value: 'default' });

        expect(result).toEqual({ value: 'default' });
      });
    });

    describe('setToStorage', () => {
      it('should set value in localStorage', () => {
        const testValue = { value: 'test' };

        setToStorage('test-key', testValue);

        expect(localStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(testValue));
      });
    });

    describe('removeFromStorage', () => {
      it('should remove value from localStorage', () => {
        removeFromStorage('test-key');

        expect(localStorage.removeItem).toHaveBeenCalledWith('test-key');
      });
    });
  });

  describe('Function utilities', () => {
    describe('debounce', () => {
      jest.useFakeTimers();

      it('should debounce function calls', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn();
        debouncedFn();
        debouncedFn();

        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledTimes(1);
      });
    });

    describe('throttle', () => {
      jest.useFakeTimers();

      it('should throttle function calls', () => {
        const mockFn = jest.fn();
        const throttledFn = throttle(mockFn, 100);

        throttledFn();
        throttledFn();
        throttledFn();

        expect(mockFn).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(100);

        throttledFn();

        expect(mockFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Color utilities', () => {
    describe('getRandomColor', () => {
      it('should return a valid hex color', () => {
        const color = getRandomColor();
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    describe('hexToRgb', () => {
      it('should convert hex to RGB', () => {
        const result = hexToRgb('#FF0000');
        expect(result).toEqual({ r: 255, g: 0, b: 0 });
      });

      it('should handle hex without #', () => {
        const result = hexToRgb('00FF00');
        expect(result).toEqual({ r: 0, g: 255, b: 0 });
      });

      it('should return null for invalid hex', () => {
        const result = hexToRgb('invalid');
        expect(result).toBeNull();
      });
    });
  });

  describe('Error utilities', () => {
    describe('getErrorMessage', () => {
      it('should extract message from error object', () => {
        const error = { message: 'Test error' };
        expect(getErrorMessage(error)).toBe('Test error');
      });

      it('should return string error as is', () => {
        expect(getErrorMessage('String error')).toBe('String error');
      });

      it('should return default message for unknown error', () => {
        expect(getErrorMessage({})).toBe('An unexpected error occurred');
      });
    });
  });

  describe('Device detection utilities', () => {
    describe('isMobile', () => {
      it('should detect mobile devices', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
          writable: true,
        });

        expect(isMobile()).toBe(true);
      });

      it('should not detect desktop as mobile', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          writable: true,
        });

        expect(isMobile()).toBe(false);
      });
    });

    describe('getDeviceType', () => {
      it('should return correct device type', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          writable: true,
        });

        expect(getDeviceType()).toBe('desktop');
      });
    });

    describe('getBrowserName', () => {
      it('should detect Chrome', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          writable: true,
        });

        expect(getBrowserName()).toBe('Chrome');
      });

      it('should return Unknown for unrecognized browsers', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'UnknownBrowser/1.0',
          writable: true,
        });

        expect(getBrowserName()).toBe('Unknown');
      });
    });
  });
});
