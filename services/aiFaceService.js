const axios = require('axios');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

/**
 * Extract face embedding from base64 image
 * @param {string} imageBase64 
 */
async function extractEmbedding(imageBase64) {
    try {
        const response = await axios.post(`${AI_ENGINE_URL}/api/face/extract`, {
            image_base64: imageBase64
        }, { timeout: 60000 });
        return response.data;
    } catch (err) {
        console.error('[AI_FACE] Extraction failed:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Verify live capture against stored embedding
 * @param {Array<number>} storedEmbedding 
 * @param {string} imageBase64 
 */
async function verifyFace(storedEmbedding, imageBase64) {
    try {
        const response = await axios.post(`${AI_ENGINE_URL}/api/face/verify`, {
            stored_embedding: storedEmbedding,
            image_base64: imageBase64
        }, { timeout: 60000 });
        return response.data;
    } catch (err) {
        console.error('[AI_FACE] Verification failed:', err.message);
        return { verified: false, error: err.message };
    }
}

/**
 * Check for duplicate faces in a list of candidates
 * @param {Array<number>} targetEmbedding 
 * @param {Array<Array<number>>} candidateEmbeddings 
 */
async function matchFace(targetEmbedding, candidateEmbeddings) {
    try {
        const response = await axios.post(`${AI_ENGINE_URL}/api/face/match`, {
            target_embedding: targetEmbedding,
            candidate_embeddings: candidateEmbeddings,
            threshold: 0.4
        });
        return response.data;
    } catch (err) {
        console.error('[AI_FACE] Matching failed:', err.message);
        return { duplicate_found: false, error: err.message };
    }
}

module.exports = {
    extractEmbedding,
    verifyFace,
    matchFace
};
