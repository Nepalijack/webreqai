// Global state
let currentSection = 0;
let totalSections = 6;
let apiKey = 'AIzaSyAZLZGIBwAmp4VX4nU2-913zhMP8f8TxBg';
let requirementsData = {};
let aiClarifications = {};
let wireframeMode = 'basic'; // Track wireframe display mode (basic or enhanced)
let basicWireframe = ''; // Store basic wireframe
let enhancedWireframe = ''; // Store enhanced wireframe
let uploadedImages = {
    hero: null,
    product1: null,
    product2: null
}; // Store uploaded images as base64

// Initialization


document.addEventListener('DOMContentLoaded', () => {
    // Warn if running from file:// (CORS will block API calls)
    if (window.location.protocol === 'file:') {
        console.warn('⚠️ Running from file:// — API calls may be blocked by CORS. Use a local server (e.g. VS Code Live Server) for full functionality.');
    }

    // Check if API key exists in localStorage
    apiKey = localStorage.getItem('gemini_api_key');
    
    if (!apiKey) {
        // showApiModal(); // Disabled for user testing - key is pre-configured
    }
    
    // Initialize progress
    updateProgress();
    
    // Add image upload handlers
    setupImageUploadHandlers();
});


// API Key Management

function setupImageUploadHandlers() {
    // Hero image handler
    const heroInput = document.getElementById('heroImage');
    if (heroInput) {
        heroInput.addEventListener('change', (e) => handleImageUpload(e, 'hero', 'heroImagePreview'));
    }
    
    // Product image 1 handler
    const product1Input = document.getElementById('productImage1');
    if (product1Input) {
        product1Input.addEventListener('change', (e) => handleImageUpload(e, 'product1', 'productImage1Preview'));
    }
    
    // Product image 2 handler
    const product2Input = document.getElementById('productImage2');
    if (product2Input) {
        product2Input.addEventListener('change', (e) => handleImageUpload(e, 'product2', 'productImage2Preview'));
    }
}

function handleImageUpload(event, imageKey, previewId) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('⚠️ Image too large! Please choose an image under 2MB.');
        event.target.value = '';
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        alert('⚠️ Please upload an image file (JPG, PNG, etc.)');
        event.target.value = '';
        return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const base64Image = e.target.result;
        
        // Store in global state
        uploadedImages[imageKey] = base64Image;
        
        // Show preview
        const previewDiv = document.getElementById(previewId);
        if (previewDiv) {
            const img = previewDiv.querySelector('img');
            if (img) {
                img.src = base64Image;
                previewDiv.style.display = 'block';
            }
            // Add remove button if not already there
            if (!previewDiv.querySelector('.btn-remove-image')) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn-remove-image';
                removeBtn.textContent = '✕ Remove Image';
                removeBtn.style.cssText = 'margin-top:0.5rem;background:transparent;border:1px solid var(--error);color:var(--error);padding:0.3rem 0.8rem;border-radius:6px;font-family:var(--font-mono);font-size:0.8rem;cursor:pointer;display:block;transition:all 0.2s ease;';
                removeBtn.onmouseenter = () => { removeBtn.style.background = 'rgba(255,0,102,0.1)'; };
                removeBtn.onmouseleave = () => { removeBtn.style.background = 'transparent'; };
                removeBtn.onclick = () => removeImage(imageKey, previewId, event.target);
                previewDiv.appendChild(removeBtn);
            }
        }
        
        console.log(`Image uploaded: ${imageKey}, size: ${(base64Image.length / 1024).toFixed(2)}KB`);
    };
    
    reader.onerror = function() {
        alert('❌ Error reading image file. Please try again.');
        event.target.value = '';
    };
    
    reader.readAsDataURL(file);
}

function removeImage(imageKey, previewId, fileInput) {
    // Clear stored image
    uploadedImages[imageKey] = null;
    
    // Reset file input
    if (fileInput) fileInput.value = '';
    
    // Hide preview and remove the remove button
    const previewDiv = document.getElementById(previewId);
    if (previewDiv) {
        const img = previewDiv.querySelector('img');
        if (img) img.src = '';
        previewDiv.style.display = 'none';
        const removeBtn = previewDiv.querySelector('.btn-remove-image');
        if (removeBtn) removeBtn.remove();
    }
}

// API Key Management

function showApiModal() {
    const modal = document.getElementById('apiModal');
    modal.classList.add('active');
}

function hideApiModal() {
    const modal = document.getElementById('apiModal');
    modal.classList.remove('active');
}

document.getElementById('saveApiKey').addEventListener('click', () => {
    const keyInput = document.getElementById('apiKeyInput');
    const key = keyInput.value.trim();
    
    if (key.startsWith('AIza')) {
        apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        hideApiModal();
        alert('✅ API Key saved successfully!');
    } else {
        alert('❌ Invalid API key format. Gemini keys start with "AIza"');
    }
});

document.getElementById('settingsBtn').addEventListener('click', showApiModal);


// Navigation Functions


function startQuestionnaire() {
    document.getElementById('introSection').classList.remove('active');
    document.getElementById('questionnaireSection').classList.add('active');
    document.querySelector('[data-section="1"]').style.display = 'block';
    currentSection = 1;
    updateProgress();
}

function nextSection(sectionNum) {
    // Validate current section
    if (!validateSection(sectionNum)) {
        alert('Please fill in the required fields before continuing.');
        return;
    }
    
    // Collect data from current section
    collectSectionData(sectionNum);
    
    // Check if AI clarification is needed
    checkAIClarificationNeeded(sectionNum).then(needed => {
        if (!needed) {
            proceedToNextSection(sectionNum);
        }
    });
}

function proceedToNextSection(sectionNum) {
    // Hide current section
    document.querySelector(`[data-section="${sectionNum}"]`).style.display = 'none';
    
    // Show next section
    const nextNum = sectionNum + 1;
    if (nextNum <= totalSections) {
        document.querySelector(`[data-section="${nextNum}"]`).style.display = 'block';
        currentSection = nextNum;
        updateProgress();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });


    }
}



function prevSection(sectionNum) {
    document.querySelector(`[data-section="${sectionNum}"]`).style.display = 'none';
    const prevNum = sectionNum - 1;
    document.querySelector(`[data-section="${prevNum}"]`).style.display = 'block';
    currentSection = prevNum;
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
    const percent = Math.round((currentSection / totalSections) * 100);
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressPercent').textContent = percent;
}


// Validation


function validateSection(sectionNum) {
    // Check if at least one field is filled — text, checkbox, radio, or select
    const section = document.querySelector(`[data-section="${sectionNum}"]`);
    let hasContent = false;

    // Text areas
    section.querySelectorAll('textarea').forEach(el => {
        if (el.value.trim().length > 0) hasContent = true;
    });

    // Text inputs
    section.querySelectorAll('input[type="text"]').forEach(el => {
        if (el.value.trim().length > 0) hasContent = true;
    });

    // Checkboxes — at least one ticked counts as content
    section.querySelectorAll('input[type="checkbox"]').forEach(el => {
        if (el.checked) hasContent = true;
    });

    // Radio buttons — one selected counts as content
    section.querySelectorAll('input[type="radio"]').forEach(el => {
        if (el.checked) hasContent = true;
    });

    // Select dropdowns — a non-empty selection counts
    section.querySelectorAll('select').forEach(el => {
        if (el.value && el.value.trim().length > 0) hasContent = true;
    });

    return hasContent;
}


// Data Collection


function collectSectionData(sectionNum) {
    const section = document.querySelector(`[data-section="${sectionNum}"]`);
    const data = {};
    
    // Collect all inputs
    section.querySelectorAll('textarea, input, select').forEach(element => {
        if (element.id) {
            if (element.type === 'checkbox') {
                if (!data.checkboxes) data.checkboxes = [];
                if (element.checked) data.checkboxes.push(element.value);
            } else if (element.type === 'radio') {
                if (element.checked) data[element.name] = element.value;
            } else {
                data[element.id] = element.value;
            }
        }
    });
    
    requirementsData[`section${sectionNum}`] = data;
    console.log('Collected data:', data);
}


// AI Integration - Smart Clarification
// Based on Marques et al. (2024) - continuous learning through iterative refinement


async function checkAIClarificationNeeded(sectionNum) {
    // Temporarily disabled to avoid rate limits
    // Users can still click "Help me brainstorm" button
    return false;
}

async function showAIClarification(sectionNum, userAnswer) {
    const clarificationDiv = document.getElementById(`clarification-${sectionNum}`);
    const questionEl = clarificationDiv.querySelector('.ai-question');
    
    // Show loading
    questionEl.textContent = 'AI is analyzing your response...';
    clarificationDiv.style.display = 'flex';
    
    try {
        const question = await getAIClarificationQuestion(sectionNum, userAnswer);
        questionEl.textContent = question;
    } catch (error) {
        console.error('AI Error:', error);
        clarificationDiv.style.display = 'none';
        alert('AI clarification error: ' + error.message);
    }
}

async function getAIClarificationQuestion(sectionNum, userAnswer) {
    const prompts = {
        1: `The user described their business purpose as: "${userAnswer}". This answer needs more clarity. Ask ONE specific follow-up question to better understand their goals. Keep it friendly and conversational.`,
        2: `The user described their target audience as: "${userAnswer}". Ask ONE clarifying question to help them define their audience more specifically.`,
        3: `The user described their design preferences as: "${userAnswer}". Ask ONE question to help them articulate their visual preferences more clearly.`,
        4: 'The user needs to specify website features. Ask ONE clarifying question about what functionality they need.',
        5: 'Ask ONE question about their content and resources for the website.',
        6: 'Ask ONE question to clarify their budget or timeline expectations.'
    };
    
    const response = await callGemini(prompts[sectionNum] || prompts[1]);
    return response;
}

function submitAIClarification(sectionNum) {
    const clarificationDiv = document.getElementById(`clarification-${sectionNum}`);
    const responseTextarea = clarificationDiv.querySelector('.ai-response');
    
    if (responseTextarea.value.trim().length === 0) {
        alert('Please provide a response to continue.');
        return;
    }
    
    // Store clarification
    aiClarifications[`section${sectionNum}`] = responseTextarea.value;
    
    // Hide clarification
    clarificationDiv.style.display = 'none';
    
    // Proceed to next section
    proceedToNextSection(sectionNum);
}


// Optional AI Help - Brainstorming
// Based on Marques et al. (2024) - improving brainstorming through idea generation


let lastHelpCall = 0;
const HELP_COOLDOWN = 10000; // 10 seconds between help requests

async function openAIHelp(fieldId) {
    if (!apiKey) {
        alert('Please configure your Google Gemini API key first.');
        showApiModal();
        return;
    }
    
    // Check cooldown
    const now = Date.now();
    const timeSinceLastHelp = now - lastHelpCall;
    
    if (timeSinceLastHelp < HELP_COOLDOWN) {
        const waitTime = Math.ceil((HELP_COOLDOWN - timeSinceLastHelp) / 1000);
        alert(`⏰ Please wait ${waitTime} seconds before requesting help again.`);
        return;
    }
    
    const field = document.getElementById(fieldId);
    const currentValue = field.value;
    
    showLoading();
    
    try {
        const help = await getBrainstormingHelp(fieldId, currentValue);
        lastHelpCall = Date.now();
        hideLoading();
        
        // Show suggestions in custom modal with selectable text
        showSuggestionsModal(help);
        
    } catch (error) {
        hideLoading();
        lastHelpCall = Date.now();
        
        if (error.message.includes('quota') || error.message.includes('rate')) {
            alert('⚠️ Rate limit reached! Please wait 1 minute before trying again.');
        } else {
            alert('Error getting AI help: ' + error.message);
        }
    }
}

function showSuggestionsModal(suggestions) {
    const modal = document.getElementById('suggestionsModal');
    const content = document.getElementById('suggestionsContent');
    content.textContent = suggestions;
    modal.style.display = 'flex';
}

function hideSuggestionsModal() {
    const modal = document.getElementById('suggestionsModal');
    modal.style.display = 'none';
}

// ==========================================
// Wireframe Mode Toggle
// ==========================================

async function switchWireframeMode(mode) {
    wireframeMode = mode;
    
    // Update button states
    const basicBtn = document.getElementById('basicModeBtn');
    const enhancedBtn = document.getElementById('enhancedModeBtn');
    
    if (mode === 'basic') {
        basicBtn.classList.add('active');
        enhancedBtn.classList.remove('active');
        
        // Show basic wireframe (already generated)
        if (basicWireframe) {
            document.getElementById('wireframePreview').innerHTML = basicWireframe;
        }
    } else {
        enhancedBtn.classList.add('active');
        basicBtn.classList.remove('active');
        
        // If enhanced not generated yet, generate it now
        if (!enhancedWireframe || enhancedWireframe.length < 50) {
            showLoading();
            try {
                enhancedWireframe = await generateWireframe('enhanced');
                hideLoading();
                
                if (enhancedWireframe && enhancedWireframe.length > 50) {
                    document.getElementById('wireframePreview').innerHTML = enhancedWireframe;
                } else {
                    hideLoading();
                    alert('❌ Could not generate enhanced wireframe. Showing basic layout instead.');
                    // Switch back to basic
                    wireframeMode = 'basic';
                    basicBtn.classList.add('active');
                    enhancedBtn.classList.remove('active');
                    document.getElementById('wireframePreview').innerHTML = basicWireframe;
                }
            } catch (error) {
                hideLoading();
                console.error('Enhanced wireframe error:', error);
                alert('❌ Could not generate enhanced wireframe. Showing basic layout instead.');
                // Switch back to basic
                wireframeMode = 'basic';
                basicBtn.classList.add('active');
                enhancedBtn.classList.remove('active');
                document.getElementById('wireframePreview').innerHTML = basicWireframe;
            }
        } else {
            // Already generated, just show it
            document.getElementById('wireframePreview').innerHTML = enhancedWireframe;
        }
    }
}

async function getBrainstormingHelp(fieldId, currentValue) {
    // Get user's location context if available
    const userLocation = requirementsData.section2?.targetLocation || 'UK';
    const isUKBusiness = userLocation.toLowerCase().includes('uk') || 
                        userLocation.toLowerCase().includes('scotland') || 
                        userLocation.toLowerCase().includes('england') ||
                        userLocation.toLowerCase().includes('wales') ||
                        userLocation.toLowerCase().includes('aberdeen') ||
                        userLocation === 'UK';
    
    // Check if the user's current input mentions UK-wide/national scope
    const inputLower = (currentValue || '').toLowerCase();
    const userWantsNational = inputLower.includes('uk') || 
                              inputLower.includes('nationwide') || 
                              inputLower.includes('national') ||
                              inputLower.includes('all over') ||
                              inputLower.includes('whole of') ||
                              inputLower.includes('across the uk') ||
                              inputLower.includes('england') ||
                              inputLower.includes('britain') ||
                              inputLower.includes('united kingdom');

    const userWantsGlobal = inputLower.includes('global') ||
                            inputLower.includes('worldwide') ||
                            inputLower.includes('world wide') ||
                            inputLower.includes('international') ||
                            inputLower.includes('everywhere') ||
                            inputLower.includes('world-wide') ||
                            inputLower.includes('across the world') ||
                            inputLower.includes('around the world');

    const locationContext = userWantsGlobal ?
        'IMPORTANT: This business targets customers globally / worldwide. Use international references and British English spelling throughout.' :
        userWantsNational ?
        'IMPORTANT: This business targets customers across the UK (nationwide). Use UK-wide references and British English spelling throughout.' :
        isUKBusiness ? 
        'IMPORTANT: This is a local business in Aberdeen, Scotland, UK. Default to Aberdeen, Aberdeenshire, and northeast Scotland locations. Use British English spelling and Scottish references where appropriate.' :
        `IMPORTANT: This business is located in ${userLocation}. Tailor suggestions to this location.`;
    
    // Check if user has already typed something
    const hasInput = currentValue && currentValue.trim().length > 0;
    const inputLength = currentValue ? currentValue.trim().length : 0;
    
    // Context-aware prompts for each field
    const prompts = {
        'businessPurpose': hasInput ? 
            // ENHANCE existing input
            `${locationContext}

User wrote: "${currentValue}"

Rewrite as 3 COMPLETE, professional purpose statements. Match the geographic scope the user described — if they said UK-wide, suggest UK-wide; if they said local, keep it local:

1. [Specific what + to whom + location matching user's stated scope]
2. [Different version]
3. [Another version]

Example for local business: "sell bread" →
1. Sell artisan sourdough bread and baked goods to local residents and cafes in Aberdeen city centre
2. Provide fresh, handcrafted bread with same-day delivery across Aberdeen and Aberdeenshire
3. Offer premium bakery products using traditional Scottish techniques to families across northeast Scotland

Transform their input. Keep it brief - ONE sentence each.`
            :
            // SUGGEST from scratch
            `${locationContext}

Give 3 example purpose statements for different Aberdeen/northeast Scotland businesses. ALL must reference Aberdeen, Aberdeenshire, or northeast Scotland specifically — no nationwide suggestions:

1. [Industry A: action + product + customer + Aberdeen/Aberdeenshire location]
2. [Industry B: different example, Aberdeen-focused]
3. [Industry C: another example, northeast Scotland focused]

Examples:
1. Sell handmade woollen crafts online to customers across Aberdeen and Aberdeenshire
2. Provide mobile dog grooming services with online booking in Aberdeen city centre and surrounding areas
3. Showcase wedding photography services to couples in northeast Scotland (Aberdeen, Aberdeenshire, Moray)

Make them diverse, ALL Aberdeen/northeast Scotland focused. ONE sentence each.`,

        'businessGoals': hasInput ?
            // ENHANCE existing input
            `The user wrote: "${currentValue}"

Expand this into 4 SPECIFIC, MEASURABLE goals. Format EXACTLY like this:

• [Specific goal with number and timeframe]
• [Another measurable goal]
• [Another goal]
• [Another goal]

Transform their vague goal into SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound).

Example transformation:
"increase sales" → 
• Increase online sales by 25% within 6 months
• Generate 50 qualified leads per month through contact forms
• Reduce cart abandonment rate from 70% to 50% within 3 months
• Achieve 5,000 monthly website visitors by end of year

Now turn their goal into 4 SMART goals with numbers and deadlines.`
            :
            // SUGGEST from scratch
            `Give 4 SMART business goals for a UK business. Format EXACTLY like this:

• [Specific measurable goal with number and timeframe]
• [Another goal]
• [Another goal]
• [Another goal]

Examples for UK businesses:
• Increase online sales by 25% within 6 months across UK market
• Generate 50 qualified leads per month from Scottish customers
• Reduce cart abandonment from 70% to 50% within 3 months
• Achieve 5,000 monthly UK visitors by end of year

Give 4 realistic goals with specific numbers and timelines.`,

        'targetAudienceAge': hasInput ?
            `User specified: "${currentValue}"

Refine this into specific age demographics. Provide:

1. **Recommended range:** [specific ages like 25-40]
2. **Why this works:** [brief reasoning]
3. **Characteristics:** [2-3 key traits of this age group]

Example:
**Recommended: 25-40 years**
Why: Young professionals with established income
Characteristics: Tech-savvy, value convenience, active online shoppers, appreciate quality`
            :
            `Help define target audience age range.

Provide specific age demographics with characteristics:

• 18-24: University students, tech-savvy, mobile-first, budget-conscious
• 25-40: Young professionals, established income, value convenience
• 40-65: Established careers, higher disposable income, value quality
• 65+: Retirees, prefer clear navigation, larger text, traditional values

Recommend 1-2 age ranges that would make sense for a typical business.`,

        'targetAudienceLocation': hasInput ?
            `${locationContext}

User wrote: "${currentValue}"

Make this more specific. UK location options:

If they said a city: Expand to "Aberdeen and surrounding 20 miles" or "Aberdeen city centre and Aberdeenshire"
If they said UK: Specify "England, Scotland, and Wales" or "UK-wide with focus on Scotland"
If vague: Suggest specific options for northeast Scotland

Example improvements:
"local" → "Aberdeen city centre and surrounding 20 miles (Aberdeenshire)"
"Scotland" → "Northeast Scotland (Aberdeen, Aberdeenshire, Moray area)"
"UK" → "UK-wide delivery with priority shipping to Scotland and northern England"

Improve their location to be specific and actionable for a northeast Scotland business.`
            :
            `${locationContext}

Define target location with UK-specific options:

• **Local:** "Aberdeen and surrounding 20 miles" or "Aberdeen city centre and Aberdeenshire"
• **Regional:** "Northeast Scotland (Aberdeen, Aberdeenshire, Moray)" or "Scotland-wide"  
• **National:** "UK-wide delivery" or "England, Scotland, and Wales"
• **International:** "EU customers" or "Worldwide shipping from Aberdeen, UK"

Recommend specific geographic targeting for a business in Aberdeen, Scotland.`,

        'designStyle': hasInput ?
            `User mentioned: "${currentValue}"

Based on their style preference, recommend 2-3 specific design approaches:

**Refined style suggestions:**
• [Style name]: [Description and when to use]
• [Alternative style]: [Description]
• [Another option]: [Description]

Example:
User said "modern" →
• **Modern Minimalist**: Clean lines, lots of white space, sans-serif fonts. Best for: tech, professional services
• **Modern Bold**: Vibrant colours, striking imagery, geometric shapes. Best for: creative agencies, entertainment
• **Scandinavian**: Light, airy, functional, neutral palette. Best for: lifestyle, home goods`
            :
            `Suggest 3 design styles popular in UK market:

• **Modern/Minimalist**: Clean lines, white space, simple navigation. Good for: UK tech startups, professional services
• **Bold/Creative**: Vibrant colours, unique layouts, eye-catching. Good for: UK creative agencies, fashion
• **Classic/Professional**: Traditional, serif fonts, formal. Good for: UK law firms, finance, medical
• **Warm/Inviting**: Soft colours, rounded edges, friendly. Good for: UK hospitality, retail, family services

Which style would work best for a typical business?`,

        'colorPreferences': hasInput ?
            `User wants: "${currentValue}"

Create 3 colour palettes that match "${currentValue}". Format:

**Palette 1: [Descriptive Name]**
Colours: #HEXCODE, #HEXCODE, #HEXCODE
Mood: [how it feels]

**Palette 2: [Name]**
Colours: #HEXCODE, #HEXCODE, #HEXCODE
Mood: [how it feels]

**Palette 3: [Name]**
Colours: #HEXCODE, #HEXCODE, #HEXCODE
Mood: [how it feels]

Example for "warm and vibrant":
**Palette 1: Sunset Warmth**
Colours: #FF6B35, #F7931E, #FDC830
Mood: Energetic, welcoming, appetizing

Create palettes matching their preference: "${currentValue}"`
            :
            `Give 3 colour palettes with HEX CODES. Format:

**Palette 1: [Name]**
Colours: #HEXCODE, #HEXCODE, #HEXCODE
Use for: [when to use this]

**Palette 2: [Name]**
Colours: #HEXCODE, #HEXCODE, #HEXCODE
Use for: [when to use this]

**Palette 3: [Name]**
Colours: #HEXCODE, #HEXCODE, #HEXCODE
Use for: [when to use this]

Example:
**Palette 1: Fresh & Natural**
Colours: #2ECC71, #FFFFFF, #8B7355
Use for: Organic products, health, eco-friendly businesses

Give 3 diverse palettes for different business types.`,

        'inspiration': hasInput ?
            `${locationContext}

User mentioned: "${currentValue}"

Based on their inspiration, suggest 3 similar UK/international websites:

• [Website]: [URL] - Similar because: [specific reason related to their input]
• [Website]: [URL] - Similar because: [reason]
• [Website]: [URL] - Similar because: [reason]

Make sure URLs are real and suggestions relate to what they wrote: "${currentValue}"`
            :
            `${locationContext}

Suggest 3-4 real UK or international websites with excellent design:

• [Website name]: [URL] - Why: [specific features to notice]

Examples:
• Monzo: monzo.com - UK fintech, clean layout, mobile-first design
• Innocent Drinks: innocentdrinks.co.uk - Playful British brand, great colour use
• ASOS: asos.com - UK fashion, excellent product filtering

Provide real URLs they can visit for UK-focused inspiration!`,

        'additionalFeatures': hasInput ?
            `User mentioned: "${currentValue}"

Expand this into 4-6 specific, detailed features:

Transform their idea into concrete features with descriptions:

Example transformations:
"booking" → 
• **Online Booking Calendar**: Real-time availability, automatic confirmations, calendar sync
• **Deposit Payment System**: Secure 20% deposit to confirm bookings
• **Cancellation Management**: 24-hour cancellation policy with automated refunds

"shop" →
• **Product Filtering**: Filter by price, size, colour, category, brand
• **Quick View**: Preview products without leaving browse page
• **Wishlist**: Save favorites with price drop notifications

Turn their feature idea into 4-6 detailed features with brief descriptions.`
            :
            `Suggest 4-6 specific website features based on common business types:

**E-commerce:**
• Product filtering (price, category, brand)
• Customer reviews and ratings
• Wishlist with email notifications
• Size/colour variations with visual swatches

**Service Business:**
• Online booking with calendar integration
• Service package comparison table
• Client testimonials showcase
• Live chat support

**Portfolio/Blog:**
• Project categorization and tagging
• Image galleries with lightbox
• Social media feed integration
• Newsletter subscription

Recommend features for a typical business.`,

        'contentStatus': hasInput ?
            `User said: "${currentValue}"

Based on this, create a detailed content preparation checklist:

**HIGH PRIORITY** (Need immediately):
• [Specific content items based on their status]
• [More items]

**MEDIUM PRIORITY** (Need before launch):
• [Items]

**CAN WAIT** (Can add after launch):
• [Items]

Be specific about word counts, image sizes, and quality requirements.`
            :
            `Help plan what content they need for their website:

**Text Content:**
• Homepage copy (300-500 words, compelling introduction)
• About Us page (400-600 words, story and values)
• Service/Product descriptions (150-300 words each)
• FAQ section (10-15 common questions with answers)

**Visual Content:**
• Hero image (2000x1200px minimum, high-quality)
• Product/service photos (professional, consistent style)
• Team photos (if applicable, professional headshots)
• Logo (vector SVG format preferred)

**Recommended Priority:**
1. Logo and brand colours (needed first)
2. Homepage copy and hero image
3. Product/service descriptions and photos
4. About Us and FAQ content

What should they prepare first?`
    };
    
    const prompt = prompts[fieldId] || `Help the user with: ${fieldId}. Current input: "${currentValue}". Provide specific, actionable suggestions.`;
    
    const response = await callGemini(prompt);
    return response;
}


// Google Gemini API Call


async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `You are a direct, no-nonsense web consultant based in Aberdeen, Scotland. Skip pleasantries. Give SPECIFIC, ACTIONABLE suggestions immediately.

${prompt}

CRITICAL FORMAT RULES:
• Always provide 3 COMPLETE suggestions/options
• Number them clearly (1., 2., 3. OR use bullet points)
• Each suggestion must be COMPLETE - don't truncate
• No "That's great!" or commentary - JUST the suggestions
• Make suggestions copy-paste ready
• IMPORTANT: Always use British English spelling throughout (colour not color, organise not organize, centre not center, favour not favor, etc.)
• IMPORTANT: When suggesting locations, default to Aberdeen, Aberdeenshire, or northeast Scotland — NOT nationwide UK suggestions, unless the prompt specifically asks for UK-wide`
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1200,  // Increased to ensure ALL 3 suggestions are complete
            }
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error('No response from Gemini API');
    }
}


// Requirements Generation

let lastAPICall = 0;
const API_COOLDOWN = 15000; // 15 seconds between calls

async function generateRequirements() {
    // Check cooldown
    const now = Date.now();
    const timeSinceLastCall = now - lastAPICall;
    
    if (timeSinceLastCall < API_COOLDOWN) {
        const waitTime = Math.ceil((API_COOLDOWN - timeSinceLastCall) / 1000);
        alert(`⏰ Please wait ${waitTime} seconds before generating again to avoid rate limits.`);
        return;
    }
    
    // Collect final section data
    collectSectionData(6);
    
    showLoading();
    
    try {
        // STEP 1: Generate requirements document
        const requirements = await generateRequirementsDocument();
        
        lastAPICall = Date.now();
        
        hideLoading();
        
        // Show output section
        document.getElementById('questionnaireSection').classList.remove('active');
        document.getElementById('outputSection').classList.add('active');
        
        // Display requirements
        document.getElementById('requirementsPreview').innerHTML = requirements;
        
        // Update progress to 100%
        currentSection = totalSections;
        updateProgress();
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // STEP 2: Generate BASIC wireframe first (lazy load enhanced when user clicks)
        setTimeout(async () => {
            try {
                console.log('Starting basic wireframe generation...');
                showLoading();
                
                const basic = await generateWireframe('basic');
                basicWireframe = basic;
                
                console.log('Basic wireframe generated, length:', basicWireframe.length);
                
                hideLoading();
                
                if (basicWireframe && basicWireframe.length > 50) {
                    console.log('Displaying basic wireframe');
                    document.getElementById('wireframePreview').innerHTML = basicWireframe;
                    document.getElementById('wireframeSection').style.display = 'block';
                    // Smooth scroll to wireframe
                    document.getElementById('wireframeSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    console.log('Wireframe too short or empty');
                }
            } catch (error) {
                console.error('Wireframe generation failed:', error);
                hideLoading();
                // Don't show error to user - wireframe is optional
            }
        }, 2000); // 2 second delay to respect rate limits
        
    } catch (error) {
        hideLoading();
        lastAPICall = Date.now();
        
        if (error.message.includes('quota') || error.message.includes('rate')) {
            alert('⚠️ Rate limit reached!\n\nPlease wait 1 minute and try again.\n\nTip: To avoid this during demos, consider setting up billing (still free/cheap) at:\nhttps://aistudio.google.com');
        } else {
            alert('Error generating requirements: ' + error.message);
        }
    }
}

async function generateRequirementsDocument() {
    const prompt = `You are a professional requirements engineer. Generate a complete, comprehensive web development requirements document.

Based on this information:
${JSON.stringify(requirementsData, null, 2)}

AI Clarifications:
${JSON.stringify(aiClarifications, null, 2)}

Create a well-structured document with these sections:
1. Project Overview
2. Business Goals  
3. Target Audience
4. Design Requirements
5. Functional Requirements (Pages & Features)
6. Content Requirements
7. Budget & Timeline

IMPORTANT: 
- Write in plain HTML without code blocks or backticks
- Use only h3, p, ul, and li tags
- Make it complete and comprehensive
- No truncated sections
- This is for a UK audience - use British Pounds (£) for all budget figures, NOT dollars ($)
- Write dates in UK format (DD/MM/YYYY) if applicable
- Return ONLY the requirements HTML, nothing else`;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 4096,
            }
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate requirements document');
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
        let content = data.candidates[0].content.parts[0].text;
        
        // Clean up any code blocks or extra formatting
        content = content.replace(/```html/g, '');
        content = content.replace(/```/g, '');
        content = content.trim();
        
        return content;
    } else {
        throw new Error('No document generated');
    }
}

async function generateWireframe(mode = 'basic') {
    if (!apiKey) {
        throw new Error('API key not configured');
    }
    
    // Get the selected pages from requirementsData
    const selectedPages = requirementsData.section4?.checkboxes || ['Home', 'About', 'Contact'];
    const businessPurpose = requirementsData.section1?.businessPurpose || 'general website';
    const colourPref = requirementsData.section3?.colorPreferences || 'neutral';
    const designStyle = requirementsData.section3?.designStyle || 'modern';
    
    let prompt;
    
    if (mode === 'basic') {
        // BASIC MODE: Simple wireframe with boxes and labels
        prompt = `Generate a website wireframe as SVG code. Return actual SVG markup with rect and text elements.

Business: ${businessPurpose}
Menu items: ${selectedPages.slice(0, 5).join(', ')}

Return this exact structure:

<svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
  <!-- Header -->
  <rect x="0" y="0" width="1200" height="100" fill="#f0f0f0" stroke="#333" stroke-width="2"/>
  <rect x="40" y="25" width="140" height="50" fill="#ffffff" stroke="#666"/>
  <text x="110" y="55" text-anchor="middle" font-family="Arial" font-size="18" fill="#333">Logo</text>
  <text x="1000" y="55" font-family="Arial" font-size="16" fill="#666">Header</text>
  <text x="1100" y="55" font-family="Arial" font-size="14" fill="#666">${selectedPages[0] || 'Home'} | ${selectedPages[1] || 'About'} | ${selectedPages[2] || 'Contact'}</text>
  
  <!-- Hero Section -->
  <rect x="0" y="100" width="1200" height="250" fill="#e8e8e8" stroke="#333" stroke-width="2"/>
  <text x="600" y="200" text-anchor="middle" font-family="Arial" font-size="24" fill="#333">Hero Section - Main Content</text>
  <text x="600" y="240" text-anchor="middle" font-family="Arial" font-size="16" fill="#666">${businessPurpose}</text>
  
  <!-- Content Section 1 -->
  <rect x="50" y="370" width="550" height="180" fill="#f0f0f0" stroke="#333" stroke-width="2"/>
  <text x="325" y="470" text-anchor="middle" font-family="Arial" font-size="18" fill="#333">Content Section 1</text>
  
  <!-- Content Section 2 -->
  <rect x="620" y="370" width="550" height="180" fill="#f0f0f0" stroke="#333" stroke-width="2"/>
  <text x="895" y="470" text-anchor="middle" font-family="Arial" font-size="18" fill="#333">Content Section 2</text>
  
  <!-- Footer -->
  <rect x="0" y="570" width="1200" height="100" fill="#d0d0d0" stroke="#333" stroke-width="2"/>
  <text x="600" y="630" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">Footer - Contact Information</text>
</svg>

Create a similar structure but customize the section labels based on the business type and menu items above. Use the SAME format with rect and text elements. DO NOT return CSS styles. Return the complete SVG markup.`;
    
    } else {
        // ENHANCED MODE: Realistic mockup with client's colours and image placeholders
        
        // Extract client's actual colours and context from their answers
        const clientColors = (requirementsData.section3?.colorPreferences || '').toLowerCase();
        const designStyleLower = designStyle.toLowerCase();
        const businessPurposeLower = businessPurpose.toLowerCase();
        
        // Initialize default colours
        let primaryColor = '#4A90E2'; // Default blue
        let accentColor = '#357ABD';
        let imageColor = '#E0E0E0'; // Default grey for images
        let imageAccent = '#999';
        let businessIcon = '🏢'; // Default business icon
        let heroText = 'Discover our premium offerings';
        let section1Title = selectedPages[3] || 'Our Services';
        let section2Title = selectedPages[4] || 'Gallery';
        
        // Detect business type and set appropriate imagery
        if (businessPurposeLower.includes('bakery') || businessPurposeLower.includes('bread') || 
            businessPurposeLower.includes('cake') || businessPurposeLower.includes('pastry') ||
            businessPurposeLower.includes('baking')) {
            // BAKERY/BREAD business
            imageColor = '#F5DEB3'; // Wheat colour
            imageAccent = '#D2691E'; // Chocolate brown
            businessIcon = '🍞';
            heroText = 'Fresh artisan baking daily';
            section1Title = 'Our Baked Goods';
            section2Title = 'Fresh Daily Selection';
        } else if (businessPurposeLower.includes('fashion') || businessPurposeLower.includes('clothing') || 
                   businessPurposeLower.includes('apparel') || businessPurposeLower.includes('style')) {
            // FASHION business
            imageColor = '#2C2C2C'; // Dark elegant
            imageAccent = '#C0C0C0'; // Silver
            businessIcon = '👗';
            heroText = 'Discover your perfect style';
            section1Title = 'New Collection';
            section2Title = 'Style Inspiration';
        } else if (businessPurposeLower.includes('restaurant') || businessPurposeLower.includes('cafe') || 
                   businessPurposeLower.includes('coffee') || businessPurposeLower.includes('food') ||
                   businessPurposeLower.includes('dining')) {
            // RESTAURANT/FOOD business
            imageColor = '#8B4513'; // Rich brown
            imageAccent = '#D2691E';
            businessIcon = '🍽️';
            heroText = 'Experience culinary excellence';
            section1Title = 'Our Menu';
            section2Title = 'Chef Specials';
        } else if (businessPurposeLower.includes('gym') || businessPurposeLower.includes('fitness') || 
                   businessPurposeLower.includes('yoga') || businessPurposeLower.includes('wellness')) {
            // FITNESS business
            imageColor = '#FF6347'; // Energetic red
            imageAccent = '#FF4500';
            businessIcon = '💪';
            heroText = 'Transform your fitness journey';
            section1Title = 'Training Programs';
            section2Title = 'Success Stories';
        } else if (businessPurposeLower.includes('beauty') || businessPurposeLower.includes('salon') || 
                   businessPurposeLower.includes('spa') || businessPurposeLower.includes('cosmetic')) {
            // BEAUTY business
            imageColor = '#FFB6C1'; // Light pink
            imageAccent = '#FF69B4';
            businessIcon = '💅';
            heroText = 'Enhance your natural beauty';
            section1Title = 'Our Services';
            section2Title = 'Before & After';
        } else if (businessPurposeLower.includes('photography') || businessPurposeLower.includes('photo')) {
            // PHOTOGRAPHY business
            imageColor = '#4A4A4A'; // Gray
            imageAccent = '#FFD700'; // Gold accent
            businessIcon = '📸';
            heroText = 'Capturing your precious moments';
            section1Title = 'Portfolio';
            section2Title = 'Client Gallery';
        } else if (businessPurposeLower.includes('music') || businessPurposeLower.includes('band') || 
                   businessPurposeLower.includes('concert')) {
            // MUSIC business
            imageColor = '#9B59B6'; // Purple
            imageAccent = '#8E44AD';
            businessIcon = '🎵';
            heroText = 'Feel the rhythm of great music';
            section1Title = 'Our Tracks';
            section2Title = 'Live Performances';
        } else if (businessPurposeLower.includes('real estate') || businessPurposeLower.includes('property')) {
            // REAL ESTATE business
            imageColor = '#2C3E50'; // Professional dark
            imageAccent = '#34495E';
            businessIcon = '🏠';
            heroText = 'Find your dream property';
            section1Title = 'Featured Properties';
            section2Title = 'Neighborhoods';
        }
        
        // PRIORITY 0: Extract actual hex codes from user input e.g. #333333
        const hexMatches = (requirementsData.section3?.colorPreferences || '').match(/#([0-9A-Fa-f]{6})/g);
        if (hexMatches && hexMatches.length >= 1) {
            primaryColor = hexMatches[0]; // First hex = primary
            accentColor = hexMatches.length >= 2 ? hexMatches[1] : hexMatches[0]; // Second hex = accent
        }

        // PRIORITY 1: Check for explicit colour names in preferences
        if (clientColors.includes('gold') || clientColors.includes('yellow')) {
            primaryColor = '#D4AF37'; // Gold
            accentColor = '#C5A028';
        } else if (clientColors.includes('brown') || clientColors.includes('chocolate')) {
            primaryColor = '#8B4513'; // Saddle Brown
            accentColor = '#A0522D';
        } else if (clientColors.includes('orange') || clientColors.includes('amber')) {
            primaryColor = '#FF8C00'; // Dark Orange
            accentColor = '#FF6347';
        } else if (clientColors.includes('red') || clientColors.includes('pink')) {
            primaryColor = '#E74C3C'; // Red
            accentColor = '#C0392B';
        } else if (clientColors.includes('purple') || clientColors.includes('violet')) {
            primaryColor = '#9B59B6'; // Purple
            accentColor = '#8E44AD';
        } else if (clientColors.includes('green') && !clientColors.includes('warm')) {
            primaryColor = '#2ECC71'; // Green
            accentColor = '#27AE60';
        } else if (clientColors.includes('blue') && !clientColors.includes('warm')) {
            primaryColor = '#4A90E2'; // Blue
            accentColor = '#357ABD';
        } else if (clientColors.includes('black') || clientColors.includes('dark') || clientColors.includes('carbon')) {
            primaryColor = '#2C3E50'; // Dark
            accentColor = '#34495E';
        } else if (clientColors.includes('grey') || clientColors.includes('gray') || 
                   clientColors.includes('silver') || clientColors.includes('chrome')) {
            primaryColor = '#707070'; // Medium grey
            accentColor = '#505050';
        } else if (clientColors.includes('white') && clientColors.includes('gold')) {
            primaryColor = '#D4AF37'; // Gold (for "gold and white")
            accentColor = '#C5A028';
        }
        
        // PRIORITY 2: Check for colour descriptors (warm, vibrant, cool, etc.)
        else if (clientColors.includes('warm')) {
            // Warm colours: browns, oranges, warm reds
            primaryColor = '#D2691E'; // Chocolate/warm brown
            accentColor = '#FF8C00'; // Dark orange
        } else if (clientColors.includes('vibrant') || clientColors.includes('bright')) {
            // Vibrant colours: bright orange or red
            primaryColor = '#FF6347'; // Tomato/vibrant red
            accentColor = '#FF4500'; // Orange red
        } else if (clientColors.includes('cool')) {
            primaryColor = '#4A90E2'; // Cool blue
            accentColor = '#357ABD';
        } else if (clientColors.includes('earthy') || clientColors.includes('natural')) {
            primaryColor = '#8B7355'; // Burlywood/earthy
            accentColor = '#A0826D';
        }
        
        // PRIORITY 3: Check business context
        else if (businessPurposeLower.includes('bakery') || businessPurposeLower.includes('bread') || 
                 businessPurposeLower.includes('cake') || businessPurposeLower.includes('pastry') ||
                 businessPurposeLower.includes('food')) {
            // Bakery/food business: warm browns and oranges
            primaryColor = '#D2691E'; // Chocolate brown
            accentColor = '#CD853F'; // Peru/tan
        } else if (businessPurposeLower.includes('restaurant') || businessPurposeLower.includes('cafe') || 
                   businessPurposeLower.includes('coffee')) {
            primaryColor = '#8B4513'; // Saddle brown
            accentColor = '#D2691E';
        } else if (businessPurposeLower.includes('fashion') || businessPurposeLower.includes('clothing') || 
                   businessPurposeLower.includes('style')) {
            primaryColor = '#2C3E50'; // Elegant dark
            accentColor = '#34495E';
        } else if (businessPurposeLower.includes('tech') || businessPurposeLower.includes('software') || 
                   businessPurposeLower.includes('app')) {
            primaryColor = '#4A90E2'; // Tech blue
            accentColor = '#357ABD';
        } else if (businessPurposeLower.includes('creative') || businessPurposeLower.includes('art') || 
                   businessPurposeLower.includes('design')) {
            primaryColor = '#9B59B6'; // Creative purple
            accentColor = '#8E44AD';
        }
        
        // PRIORITY 4: Check design style as final fallback
        else if (designStyleLower.includes('luxury')) {
            primaryColor = '#D4AF37'; // Gold for luxury
            accentColor = '#C5A028';
        } else if (designStyleLower.includes('professional') || designStyleLower.includes('corporate')) {
            primaryColor = '#2C3E50'; // Professional dark blue
            accentColor = '#34495E';
        } else if (designStyleLower.includes('vibrant') || designStyleLower.includes('energetic')) {
            primaryColor = '#E74C3C'; // Vibrant red
            accentColor = '#C0392B';
        } else if (designStyleLower.includes('creative')) {
            primaryColor = '#FF6347'; // Creative warm red
            accentColor = '#FF8C00';
        }
        
        prompt = `Create this EXACT SVG wireframe with realistic styling and context-appropriate images:

<svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
  <!-- Header with client's colour -->
  <rect x="0" y="0" width="1200" height="100" fill="${primaryColor}" stroke="#333" stroke-width="2"/>
  <rect x="40" y="25" width="150" height="50" fill="#ffffff" stroke="#ddd" rx="5"/>
  <text x="115" y="55" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#333">${businessPurpose.substring(0, 20)}</text>
  <text x="1050" y="60" font-family="Arial" font-size="14" fill="#ffffff">${selectedPages[0] || 'Home'}   ${selectedPages[1] || 'About'}   ${selectedPages[2] || 'Contact'}</text>
  
  <!-- Hero Section with business-specific image placeholder -->
  <rect x="0" y="100" width="1200" height="300" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
  <!-- Hero image with business context -->
  <rect x="50" y="130" width="500" height="240" fill="${imageColor}" stroke="#999" stroke-width="1"/>
  <text x="300" y="230" text-anchor="middle" font-family="Arial" font-size="60" fill="${imageAccent}">${businessIcon}</text>
  <text x="300" y="280" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="${imageAccent}">Sample Image</text>
  <!-- Hero text -->
  <text x="650" y="200" font-family="Arial" font-size="32" font-weight="bold" fill="#333">${businessPurpose}</text>
  <text x="650" y="240" font-family="Arial" font-size="16" fill="#666">${heroText}</text>
  <!-- CTA Button -->
  <rect x="650" y="260" width="180" height="50" fill="${primaryColor}" stroke="#333" stroke-width="1" rx="25"/>
  <text x="740" y="290" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#ffffff">Get Started</text>
  
  <!-- Content Section 1 - Card style with business context -->
  <rect x="50" y="430" width="540" height="220" fill="#FFFFFF" stroke="#ddd" stroke-width="2" rx="8"/>
  <!-- Image placeholder in card -->
  <rect x="70" y="450" width="500" height="120" fill="${imageColor}" stroke="#999" stroke-width="1"/>
  <text x="320" y="505" text-anchor="middle" font-family="Arial" font-size="40" fill="${imageAccent}">${businessIcon}</text>
  <text x="320" y="535" text-anchor="middle" font-family="Arial" font-size="12" fill="${imageAccent}">Sample Image</text>
  <text x="320" y="595" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold" fill="#333">${section1Title}</text>
  <text x="320" y="625" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">Explore what we offer</text>
  
  <!-- Content Section 2 - Card style with business context -->
  <rect x="610" y="430" width="540" height="220" fill="#FFFFFF" stroke="#ddd" stroke-width="2" rx="8"/>
  <!-- Image placeholder in card -->
  <rect x="630" y="450" width="500" height="120" fill="${imageColor}" stroke="#999" stroke-width="1"/>
  <text x="880" y="505" text-anchor="middle" font-family="Arial" font-size="40" fill="${imageAccent}">${businessIcon}</text>
  <text x="880" y="535" text-anchor="middle" font-family="Arial" font-size="12" fill="${imageAccent}">Sample Image</text>
  <text x="880" y="595" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold" fill="#333">${section2Title}</text>
  <text x="880" y="625" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">See our latest work</text>
  
  <!-- Footer -->
  <rect x="0" y="670" width="1200" height="130" fill="#2C3E50" stroke="#333" stroke-width="2"/>
  <text x="600" y="720" text-anchor="middle" font-family="Arial" font-size="16" fill="#ffffff">Contact Information</text>
  <text x="600" y="750" text-anchor="middle" font-family="Arial" font-size="14" fill="#999">© 2024 ${businessPurpose.substring(0, 40)}</text>
</svg>

CRITICAL: Return this EXACT SVG with no modifications. Copy it exactly as shown above.`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.3,  // Lower = more consistent and complete
                maxOutputTokens: 3072,  // Increased to ensure full SVG
            }
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate wireframe');
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
        let svg = data.candidates[0].content.parts[0].text;
        
        console.log('=== RAW WIREFRAME RESPONSE ===');
        console.log(svg);
        console.log('=== END RAW RESPONSE ===');
        
        // Clean up any markdown
        svg = svg.replace(/```svg/g, '');
        svg = svg.replace(/```xml/g, '');
        svg = svg.replace(/```/g, '');
        svg = svg.trim();
        
        console.log('After cleanup, length:', svg.length);
        
        // Extract just the SVG if there's extra text
        const svgMatch = svg.match(/(<svg[\s\S]*?<\/svg>)/i);
        if (svgMatch) {
            svg = svgMatch[1];
            console.log('Extracted SVG from match, new length:', svg.length);
        } else {
            console.log('⚠️ No <svg> tags found in response!');
        }
        
        // If enhanced mode and user has uploaded images, embed them
        if (mode === 'enhanced') {
            svg = embedUploadedImages(svg);
        }
        
        return svg;
    } else {
        console.error('❌ No candidates in API response');
        throw new Error('No wireframe generated');
    }
}

function embedUploadedImages(svg) {
    // Check if user has uploaded any images
    const hasHero = uploadedImages.hero !== null;
    const hasProduct1 = uploadedImages.product1 !== null;
    const hasProduct2 = uploadedImages.product2 !== null;
    
    if (!hasHero && !hasProduct1 && !hasProduct2) {
        console.log('No uploaded images - using placeholders');
        return svg; // No images uploaded, return as-is
    }
    
    console.log('Embedding uploaded images into SVG...');
    
    // Create a DOM parser to manipulate the SVG
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');
    
    if (!svgElement) {
        console.error('Could not parse SVG for image embedding');
        return svg;
    }
    
    // Helper function to create image element
    function createImageElement(x, y, width, height, href) {
        const image = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
        image.setAttribute('x', x);
        image.setAttribute('y', y);
        image.setAttribute('width', width);
        image.setAttribute('height', height);
        image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        return image;
    }
    
    // Helper function to remove all text elements within a region
    function removeTextInRegion(xMin, xMax, yMin, yMax) {
        const allTexts = svgDoc.querySelectorAll('text');
        allTexts.forEach(text => {
            const x = parseFloat(text.getAttribute('x') || 0);
            const y = parseFloat(text.getAttribute('y') || 0);
            if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
                text.remove();
            }
        });
    }
    
    // Replace hero image placeholder (coordinates from prompt: x=50 y=130 width=500 height=240)
    if (hasHero) {
        console.log('Embedding hero image...');
        const heroImage = createImageElement('50', '130', '500', '240', uploadedImages.hero);
        
        // Find and remove the placeholder rect
        const heroRect = svgDoc.querySelector('rect[x="50"][y="130"]');
        if (heroRect) {
            // Insert real image before removing placeholder
            heroRect.parentNode.insertBefore(heroImage, heroRect);
            heroRect.remove();
        } else {
            // If exact match not found, try to insert at beginning of SVG
            svgElement.insertBefore(heroImage, svgElement.firstChild);
        }
        
        // Remove ALL text elements in hero image area (icons, "Sample Image", etc.)
        // Hero area: x=50-550, y=130-370
        removeTextInRegion(50, 550, 130, 370);
    }
    
    // Replace product image 1 placeholder (coordinates: x=70 y=450 width=500 height=120)
    if (hasProduct1) {
        console.log('Embedding product image 1...');
        const product1Image = createImageElement('70', '450', '500', '120', uploadedImages.product1);
        
        const product1Rect = svgDoc.querySelector('rect[x="70"][y="450"]');
        if (product1Rect) {
            product1Rect.parentNode.insertBefore(product1Image, product1Rect);
            product1Rect.remove();
        } else {
            // Insert into parent container
            const container = svgDoc.querySelector('rect[x="50"][y="430"]');
            if (container && container.parentNode) {
                container.parentNode.appendChild(product1Image);
            }
        }
        
        // Remove ALL text in product 1 image area
        // Product 1 area: x=70-570, y=450-570 (image only, not title below)
        removeTextInRegion(70, 570, 450, 570);
    }
    
    // Replace product image 2 placeholder (coordinates: x=630 y=450 width=500 height=120)
    if (hasProduct2) {
        console.log('Embedding product image 2...');
        const product2Image = createImageElement('630', '450', '500', '120', uploadedImages.product2);
        
        const product2Rect = svgDoc.querySelector('rect[x="630"][y="450"]');
        if (product2Rect) {
            product2Rect.parentNode.insertBefore(product2Image, product2Rect);
            product2Rect.remove();
        } else {
            // Insert into parent container
            const container = svgDoc.querySelector('rect[x="610"][y="430"]');
            if (container && container.parentNode) {
                container.parentNode.appendChild(product2Image);
            }
        }
        
        // Remove ALL text in product 2 image area
        // Product 2 area: x=630-1130, y=450-570 (image only, not title below)
        removeTextInRegion(630, 1130, 450, 570);
    }
    
    // Serialize back to string
    const serializer = new XMLSerializer();
    const modifiedSVG = serializer.serializeToString(svgElement);
    
    console.log(`✅ Embedded ${[hasHero, hasProduct1, hasProduct2].filter(Boolean).length} uploaded images`);
    
    return modifiedSVG;
}


// ==========================================
// Output Functions
// ==========================================

function downloadPDF() {
    // Get the requirements text
    const previewDiv = document.getElementById('requirementsPreview');
    
    if (!previewDiv || !previewDiv.innerHTML || previewDiv.innerHTML.trim().length === 0) {
        alert('❌ No requirements to download. Please generate requirements first.');
        return;
    }
    
    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set up margins and initial position
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    
    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Supporting Design Thinking Based Web Site', margin, yPos);
    yPos += 7;
    doc.text('Development with Generative AI', margin, yPos);
    yPos += 10;
    
    // Subtitle
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Requirements Document', margin, yPos);
    yPos += 5;
    doc.text('Generated by WebReq AI Tool', margin, yPos);
    yPos += 5;
    doc.text('Date: ' + new Date().toLocaleDateString(), margin, yPos);
    yPos += 15;
    
    // Create a clean clone and process it
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = previewDiv.innerHTML;
    
    // Process only direct children to avoid duplicates
    const processElement = (element, indent = 0) => {
        // Check if we need a new page
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
        }
        
        const tagName = element.tagName;
        const text = element.textContent.trim();
        
        if (!text) return;
        
        if (tagName === 'H1' || tagName === 'H2' || tagName === 'H3') {
            // Section heading
            yPos += 5;
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            const lines = doc.splitTextToSize(text, maxWidth);
            lines.forEach(line => {
                if (yPos > pageHeight - 30) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, margin + indent, yPos);
                yPos += 6;
            });
            yPos += 2;
        } else if (tagName === 'P') {
            // Paragraph
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const lines = doc.splitTextToSize(text, maxWidth - indent);
            lines.forEach(line => {
                if (yPos > pageHeight - 30) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, margin + indent, yPos);
                yPos += 5;
            });
            yPos += 3;
        } else if (tagName === 'UL') {
            // Process list items directly
            const listItems = element.children;
            for (let i = 0; i < listItems.length; i++) {
                const li = listItems[i];
                if (li.tagName === 'LI') {
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    
                    // Get only the direct text of the LI, not nested ULs
                    let liText = '';
                    for (let node of li.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            liText += node.textContent.trim() + ' ';
                        } else if (node.tagName === 'STRONG' || node.tagName === 'B') {
                            liText += node.textContent.trim() + ' ';
                        }
                    }
                    
                    liText = liText.trim();
                    
                    if (liText) {
                        const bulletText = '• ' + liText;
                        const lines = doc.splitTextToSize(bulletText, maxWidth - indent - 5);
                        lines.forEach((line, lineIndex) => {
                            if (yPos > pageHeight - 30) {
                                doc.addPage();
                                yPos = 20;
                            }
                            const xOffset = lineIndex === 0 ? margin + indent : margin + indent + 5;
                            doc.text(line, xOffset, yPos);
                            yPos += 5;
                        });
                        
                        // Check for nested UL
                        const nestedUl = li.querySelector('ul');
                        if (nestedUl) {
                            processElement(nestedUl, indent + 10);
                        }
                    }
                }
            }
            yPos += 2;
        }
    };
    
    // Process all direct children
    const children = tempDiv.children;
    for (let i = 0; i < children.length; i++) {
        processElement(children[i], 0);
    }
    
    // Save the PDF
    doc.save('Web-Requirements-Document.pdf');
    alert('✅ Requirements downloaded as PDF!');
}

function downloadWord() {
    // Get the requirements HTML
    const previewDiv = document.getElementById('requirementsPreview');
    
    // Wait a moment to ensure content is loaded
    if (!previewDiv || !previewDiv.innerHTML || previewDiv.innerHTML.trim().length === 0) {
        alert('❌ No requirements to download. Please generate requirements first.');
        return;
    }
    
    const htmlContent = previewDiv.innerHTML;
    
    // Create a proper Word-compatible HTML document
    const wordHTML = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset='utf-8'>
    <title>Requirements Document</title>
    <style>
        body { 
            font-family: Calibri, Arial, sans-serif; 
            padding: 40px; 
            line-height: 1.6;
            colour: #000000;
        }
        h1 { 
            colour: #00cc6d; 
            border-bottom: 3px solid #00cc6d; 
            padding-bottom: 10px; 
            font-size: 24pt;
            margin-bottom: 20px;
        }
        h2 {
            colour: #333333;
            font-size: 14pt;
            margin-top: 10px;
            margin-bottom: 5px;
        }
        h3 { 
            colour: #00cc6d; 
            margin-top: 20px; 
            border-bottom: 1px solid #cccccc; 
            padding-bottom: 5px; 
            font-size: 14pt;
        }
        p { 
            line-height: 1.6; 
            colour: #333333; 
            margin: 10px 0;
            font-size: 11pt;
        }
        ul { 
            margin: 10px 0 10px 20px; 
        }
        li { 
            margin: 5px 0; 
            colour: #333333;
            font-size: 11pt;
        }
        .header-info {
            colour: #666666;
            font-size: 10pt;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <h1>Supporting Design Thinking Based Web Site Development with Generative AI</h1>
    <div class="header-info">
        <p><strong>Requirements Document</strong></p>
        <p>Generated by WebReq AI Tool</p>
        <p>Date: ${new Date().toLocaleDateString()}</p>
    </div>
    <hr>
    ${htmlContent}
</body>
</html>`;
    
    // Create blob with proper Word MIME type
    const blob = new Blob([wordHTML], {
        type: 'application/vnd.ms-word'
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Web-Requirements-Document.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('✅ Requirements downloaded as Word document!');
}

function emailDocument() {
    const previewDiv = document.getElementById('requirementsPreview');
    
    if (!previewDiv || !previewDiv.innerHTML || previewDiv.innerHTML.trim().length === 0) {
        alert('❌ No requirements to generate. Please generate requirements first.');
        return;
    }
    
    const email = prompt('Enter designer\'s email address:');
    
    if (!email) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('❌ Invalid email address format.');
        return;
    }
    
    // Get requirements text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = previewDiv.innerHTML;
    const text = tempDiv.innerText || tempDiv.textContent;
    
    // Create email content
    const emailSubject = 'Web Development Requirements Document';
    const emailBody = `Hello,

Please find the web development requirements below:

---

${text}

---

Best regards`;
    
    // Try clipboard first (more reliable)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(emailBody).then(() => {
            const proceed = confirm(
                `✅ Requirements copied to clipboard!\n\n` +
                `Designer email: ${email}\n\n` +
                `What would you like to do?\n\n` +
                `• Click OK to open email client\n` +
                `• Click Cancel to manually paste in your email app\n\n` +
                `(The requirements are already copied - just paste with Ctrl+V)`
            );
            
            if (proceed) {
                tryOpenEmailClient(email, emailSubject, text);
            } else {
                alert(`📋 Requirements copied!\n\nNow:\n1. Open your email app\n2. Create new email to: ${email}\n3. Paste (Ctrl+V) the requirements\n4. Send!`);
            }
        }).catch(() => {
            // Fallback if clipboard fails
            tryOpenEmailClient(email, emailSubject, text);
        });
    } else {
        // No clipboard support, try email client
        tryOpenEmailClient(email, emailSubject, text);
    }
}

function tryOpenEmailClient(email, subject, bodyText) {
    // Truncate if too long (mailto has limits)
    const maxLength = 1500;
    let truncatedBody = bodyText.substring(0, maxLength);
    if (bodyText.length > maxLength) {
        truncatedBody += '\n\n[Document truncated - please download Word/PDF file for full requirements]';
    }
    
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent('Hello,\n\nPlease find the web development requirements below:\n\n---\n\n' + truncatedBody + '\n\n---\n\nBest regards');
    
    const mailtoLink = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
    
    // Create a temporary link and try to click it
    const a = document.createElement('a');
    a.href = mailtoLink;
    a.style.display = 'none';
    document.body.appendChild(a);
    
    try {
        a.click();
        
        // Show success message after a delay
        setTimeout(() => {
            alert(
                `📧 Email client should open!\n\n` +
                `If it didn't:\n` +
                `1. Download Word/PDF document instead\n` +
                `2. Attach it to an email manually\n` +
                `3. Send to: ${email}\n\n` +
                `Tip: Make sure you have a default email app set (Gmail, Outlook, Mail, etc.)`
            );
        }, 500);
    } catch (error) {
        alert(
            `❌ Could not open email client.\n\n` +
            `Alternative methods:\n` +
            `1. Download the Word or PDF document\n` +
            `2. Email it manually to: ${email}\n\n` +
            `Or set up a default email app:\n` +
            `• Windows: Settings → Apps → Default apps → Email\n` +
            `• Mac: Mail app → Preferences → Default email reader`
        );
    } finally {
        document.body.removeChild(a);
    }
}

function startOver() {
    if (confirm('Are you sure you want to start over? All progress will be lost.')) {
        requirementsData = {};
        aiClarifications = {};
        currentSection = 0;
        
        document.getElementById('outputSection').classList.remove('active');
        document.getElementById('introSection').classList.add('active');
        
        // Reset all forms
        document.querySelectorAll('textarea, input').forEach(el => {
            if (el.type !== 'password') el.value = '';
        });
        
        // Hide all question cards
        document.querySelectorAll('.question-card').forEach(card => {
            card.style.display = 'none';
        });
        
        updateProgress();
    }
}

// ==========================================
// Wireframe Functions
// ==========================================

async function regenerateWireframe() {
    if (!apiKey) {
        alert('Please configure your API key first.');
        showApiModal();
        return;
    }
    
    // Check rate limit
    const now = Date.now();
    if (now - lastAPICall < API_COOLDOWN) {
        const waitTime = Math.ceil((API_COOLDOWN - (now - lastAPICall)) / 1000);
        alert(`⏳ Please wait ${waitTime} seconds before regenerating.`);
        return;
    }
    
    showLoading();
    
    try {
        // Only regenerate CURRENT mode to avoid double API calls
        const newWireframe = await generateWireframe(wireframeMode);
        
        // Update the current mode's wireframe
        if (wireframeMode === 'basic') {
            basicWireframe = newWireframe;
        } else {
            enhancedWireframe = newWireframe;
        }
        
        lastAPICall = Date.now();
        hideLoading();
        
        if (newWireframe && newWireframe.trim().length > 50) {
            document.getElementById('wireframePreview').innerHTML = newWireframe;
            document.getElementById('wireframeSection').style.display = 'block';
            alert(`✅ ${wireframeMode === 'basic' ? 'Basic' : 'Enhanced'} wireframe regenerated successfully!`);
        } else {
            throw new Error('Generated wireframe is empty or too short');
        }
        
    } catch (error) {
        hideLoading();
        lastAPICall = Date.now();
        console.error('Wireframe regeneration error:', error);
        
        if (error.message.includes('quota') || error.message.includes('rate') || error.message.includes('429')) {
            alert('⚠️ Rate limit reached!\n\nPlease wait 1 minute before trying again.\n\nTip: For demos, consider setting up billing at https://aistudio.google.com');
        } else if (error.message.includes('high demand')) {
            alert('⚠️ Gemini API is experiencing high demand.\n\nPlease wait 1-2 minutes and try again.');
        } else {
            alert('❌ Failed to regenerate wireframe.\n\nError: ' + error.message + '\n\nThe existing wireframe is still displayed.');
        }
    }
}

function approveWireframe() {
    alert('✅ Great! The wireframe has been approved.\n\nYou can now download the complete requirements document with the visual layout reference.');
    
    // Optional: Could add a visual indicator that it's approved
    const approveBtn = document.querySelector('.wireframe-actions button:last-child');
    if (approveBtn) {
        approveBtn.textContent = '✅ Approved';
        approveBtn.disabled = true;
        approveBtn.style.opacity = '0.6';
    }
}

function downloadWireframeImage() {
    const svgElement = document.querySelector('#wireframePreview svg');
    
    if (!svgElement) {
        alert('❌ No wireframe to download. Generate requirements first.');
        return;
    }
    
    // Get SVG dimensions
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size (from SVG viewBox or default)
    canvas.width = 1200;
    canvas.height = 800;
    
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = function() {
        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw SVG
        ctx.drawImage(img, 0, 0);
        
        // Convert to PNG and download
        canvas.toBlob(function(blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'Website-Wireframe.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            URL.revokeObjectURL(url);
            
            alert('✅ Wireframe downloaded as PNG image!\n\nYou can attach this to your requirements document.');
        });
    };
    
    img.src = url;
}


// ==========================================
// Review & Edit Answers
// ==========================================

function openReviewModal() {
    // Map: review field ID -> original form field ID
    const fieldMap = [
        // Section 1
        ['review_businessPurpose', 'businessPurpose'],
        ['review_businessGoals',   'businessGoals'],
        // Section 2
        ['review_targetAudience',  'targetAudience'],
        ['review_ageRange',        'ageRange'],
        ['review_location',        'location'],
        ['review_techLevel',       'techLevel'],
        // Section 3
        ['review_designStyle',     'style'],          // radio group — handled separately
        ['review_designStyleCustom','designStyleCustom'],
        ['review_colorPreferences','colorPreferences'],
        ['review_inspirationWebsites','inspirationWebsites'],
        // Section 4
        ['review_pagesNeeded',     'pagesNeeded'],
        ['review_specialFeatures', 'additionalFeatures'],
        // Section 5
        ['review_contentStatus',   'contentStatus'],
        ['review_contentNotes',    'contentNotes'],
        // Section 6
        ['review_budget',          'budget'],
        ['review_timeline',        'timeline'],
        ['review_additionalInfo',  'additionalInfo'],
    ];

    fieldMap.forEach(([reviewId, origId]) => {
        const reviewEl = document.getElementById(reviewId);
        if (!reviewEl) return;

        if (origId === 'style') {
            // Radio group — get the checked value
            const checked = document.querySelector('input[name="style"]:checked');
            reviewEl.value = checked ? checked.value : '';
        } else {
            const origEl = document.getElementById(origId);
            if (origEl) reviewEl.value = origEl.value || '';
        }
    });

    document.getElementById('reviewModal').classList.add('active');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('active');
}

function saveAndRegenerate() {
    // Write review values back to the original form fields
    const fieldMap = [
        ['review_businessPurpose', 'businessPurpose', 'textarea'],
        ['review_businessGoals',   'businessGoals',   'textarea'],
        ['review_targetAudience',  'targetAudience',  'textarea'],
        ['review_ageRange',        'ageRange',        'input'],
        ['review_location',        'location',        'input'],
        ['review_techLevel',       'techLevel',       'select'],
        ['review_designStyleCustom','designStyleCustom','textarea'],
        ['review_colorPreferences','colorPreferences', 'input'],
        ['review_inspirationWebsites','inspirationWebsites','textarea'],
        ['review_pagesNeeded',     'pagesNeeded',     'textarea'],
        ['review_specialFeatures', 'additionalFeatures','textarea'],
        ['review_contentStatus',   'contentStatus',   'textarea'],
        ['review_contentNotes',    'contentNotes',    'textarea'],
        ['review_budget',          'budget',          'select'],
        ['review_timeline',        'timeline',        'select'],
        ['review_additionalInfo',  'additionalInfo',  'textarea'],
    ];

    fieldMap.forEach(([reviewId, origId]) => {
        const reviewEl = document.getElementById(reviewId);
        const origEl   = document.getElementById(origId);
        if (reviewEl && origEl) origEl.value = reviewEl.value;
    });

    // Handle design style radio
    const styleValue = document.getElementById('review_designStyle')?.value;
    if (styleValue) {
        const radio = document.querySelector(`input[name="style"][value="${styleValue}"]`);
        if (radio) radio.checked = true;
    }

    // Re-collect all section data
    for (let i = 1; i <= totalSections; i++) {
        collectSectionData(i);
    }

    closeReviewModal();

    // Regenerate the document
    generateRequirements();
}

// UI Helper Functions

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}
