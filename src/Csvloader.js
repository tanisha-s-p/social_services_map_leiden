/**
 * CSV Loader Utility
 * Parses CSV data and converts to location/service objects
 */

// Simple CSV parser
export const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());

    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // Skip empty lines

        const values = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));

        const row = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
        });
        rows.push(row);
    }

    return rows;
};

/**
 * Convert CSV rows to location objects
 * Expected CSV columns: location_id, name, address, postcode, latitude, longitude, location_type, last_checked
 */
export const csvToLocations = (csvText) => {
    const rows = parseCSV(csvText);
    return rows.map(row => ({
        location_id: row.location_id || row.id || '',
        name: row.name || '',
        address: row.address || '',
        postcode: row.postcode || '',
        latitude: parseFloat(row.latitude) || 0,
        longitude: parseFloat(row.longitude) || 0,
        location_type: row.location_type || row.type || 'Buurthuis',
        google_map_link: row.google_map_link || '',
        last_checked: row.last_checked || new Date().toISOString(),
    })).filter(l => l.location_id && l.name); // Filter out empty rows
};

/**
 * Convert CSV rows to service objects
 * Expected CSV columns: service_id, name, category, type, description, target_group,
 * income_requirement, cost_to_user, access_type, location_id, availability,
 * phone, email, website, keywords, notes, needs_referral, last_checked, last_verified
 */
export const csvToServices = (csvText) => {
    const rows = parseCSV(csvText);
    return rows.map(row => ({
        service_id: row.service_id || row.id || '',
        name: row.name || '',
        category: row.category || 'Gezondheid en zorg',
        type: row.type || 'Advies',
        description: row.description || '',
        target_group: row.target_group || '',
        income_requirement: row.income_requirement || 'Geen',
        cost_to_user: row.cost_to_user || 'Gratis',
        access_type: row.access_type || 'Inloop',
        location_id: row.location_id || '',
        availability: row.availability || '',
        phone: row.phone || '',
        email: row.email || '',
        website: row.website || '',
        keywords: row.keywords || '',
        notes: row.notes || '',
        needs_referral: row.needs_referral === 'true' || row.needs_referral === '1' || false,
        last_checked: row.last_checked || new Date().toISOString(),
        last_verified: row.last_verified || new Date().toISOString(),
    })).filter(s => s.service_id && s.name); // Filter out empty rows
};

/**
 * Dynamically load CSV files from public folder
 */
export const loadCSVFile = async (filename) => {
    try {
        const response = await fetch(`/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error loading CSV file ${filename}:`, error);
        return '';
    }
};

/**
 * Load both CSV files and convert to initial data
 */
export const loadInitialData = async () => {
    const locationsCSV = await loadCSVFile('locations.csv');
    const servicesCSV = await loadCSVFile('services.csv');

    return {
        locations: csvToLocations(locationsCSV),
        services: csvToServices(servicesCSV),
    };
};