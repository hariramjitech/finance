import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_STORAGE_KEY || 'finance-hub-super-secret-key-2025';

export const secureStorage = {
    setItem: (key, value) => {
        try {
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(value), SECRET_KEY).toString();
            localStorage.setItem(key, encrypted);
        } catch (error) {
            console.error('Error encrypting data', error);
        }
    },

    getItem: (key) => {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;

            const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
            const originalText = decrypted.toString(CryptoJS.enc.Utf8);

            if (!originalText) return null;

            return JSON.parse(originalText);
        } catch (error) {
            console.error('Error decrypting data/Storage tampered', error);
            // If decryption fails (tampering), clear the invalid data
            localStorage.removeItem(key);
            return null;
        }
    },

    removeItem: (key) => {
        localStorage.removeItem(key);
    },

    clear: () => {
        localStorage.clear();
    }
};
