const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');

// Provide a way to get the license file path (can be passed or default)
const LICENSE_FILE_NAME = 'license.key';

class LicenseManager {
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
        this.licensePath = path.join(userDataPath, LICENSE_FILE_NAME);
        this.publicKeyPath = path.join(__dirname, 'public.pem');
        this.machineId = '';
    }

    getMachineId() {
        if (!this.machineId) {
            try {
                this.machineId = machineIdSync();
            } catch (e) {
                console.error("Failed to get machine ID", e);
                this.machineId = 'UNKNOWN-MACHINE-ID';
            }
        }
        return this.machineId;
    }

    async verifyLicense() {
        // 1. Check if license file exists
        if (!fs.existsSync(this.licensePath)) {
            return { valid: false, reason: 'No license file found.' };
        }

        // 2. Read license file
        let licenseContent;
        try {
            licenseContent = fs.readFileSync(this.licensePath, 'utf-8');
        } catch (e) {
            return { valid: false, reason: 'Could not read license file.' };
        }

        let licenseObj;
        try {
            licenseObj = JSON.parse(licenseContent);
        } catch (e) {
            return { valid: false, reason: 'Invalid license format.' };
        }

        if (!licenseObj.data || !licenseObj.signature) {
            return { valid: false, reason: 'Corrupt license data.' };
        }

        // 3. Verify Signature
        if (!fs.existsSync(this.publicKeyPath)) {
            // In dev, sometimes path might be different?
            // Assuming it's in the same folder as this script for now
            return { valid: false, reason: 'Internal Error: Public key missing.' };
        }

        const publicKey = fs.readFileSync(this.publicKeyPath, 'utf8');

        const verify = crypto.createVerify('SHA256');
        verify.update(JSON.stringify(licenseObj.data));
        verify.end();

        const isSignatureValid = verify.verify(publicKey, licenseObj.signature, 'base64');

        if (!isSignatureValid) {
            return { valid: false, reason: 'Invalid license signature.' };
        }

        // 4. Verify Machine ID
        const currentMachineId = this.getMachineId();
        if (licenseObj.data.machineId !== currentMachineId) {
            // Optional: You could allow empty machineId for "floating" licenses if desired, 
            // but for this requirement strict locking is requested.
            return {
                valid: false,
                reason: `License is locked to another machine. (ID: ${licenseObj.data.machineId})`
            };
        }

        // 5. Verify Expiration
        const expirationDate = new Date(licenseObj.data.expiration);
        if (new Date() > expirationDate) {
            return { valid: false, reason: 'License expired.' };
        }

        return { valid: true, data: licenseObj.data };
    }

    // Helper to save license from activation UI
    saveLicense(licenseContent) {
        try {
            // Basic validation before saving
            const obj = JSON.parse(licenseContent);
            if (obj.data && obj.signature) {
                fs.writeFileSync(this.licensePath, licenseContent, 'utf-8');
                return { success: true };
            }
            return { success: false, error: 'Invalid license content structure' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = LicenseManager;
