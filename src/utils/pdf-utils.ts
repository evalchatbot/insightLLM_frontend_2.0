// Function to count pages in a PDF
export async function countPdfPages(arrayBuffer: ArrayBuffer): Promise<number> {
  try {
    // If it's a PDF file
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdfContent = new TextDecoder().decode(uint8Array);
    
    // Use regex to find /Count in the PDF
    const countMatch = /\/Count\s+(\d+)/.exec(pdfContent);
    if (countMatch && countMatch[1]) {
      return parseInt(countMatch[1], 10);
    }
    
    // Fallback: count /Page objects
    const pageMatches = pdfContent.match(/\/Type\s*\/Page[^s]/g);
    if (pageMatches) {
      return pageMatches.length;
    }
    
    // If we can't determine the page count, assume 1 page
    return 1;
  } catch (error) {
    console.error('Error counting PDF pages:', error);
    return 1; // Default to 1 page if counting fails
  }
}