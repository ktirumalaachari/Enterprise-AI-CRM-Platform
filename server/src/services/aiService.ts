const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CANDIDATE_MODELS = [
  'groq/compound',
  'groq/compound-mini',
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
];

export class AiService {
  private static async callGroq(messages: { role: string; content: string }[], temperature = 0.7): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY || '';

    if (!apiKey) {
      console.warn('[AiService] GROQ_API_KEY is missing from environment variables.');
      throw new Error('GROQ_API_KEY is missing.');
    }

    let lastError: Error | null = null;

    // Try candidate models sequentially until one succeeds
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: 1024,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[AiService] Groq model ${model} failed (${response.status}):`, errorText);
          lastError = new Error(`Groq model ${model} returned ${response.status}`);
          continue;
        }

        const data: any = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return reply;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AiService] Groq model ${model} call error:`, err.message);
      }
    }

    throw lastError || new Error('All Groq AI models failed.');
  }

  // 1. Generate Custom Sales Emails
  static async generateSalesEmail(params: {
    recipientName: string;
    company?: string;
    dealValue?: number;
    emailType: 'Cold Outreach' | 'Follow-up' | 'Proposal Intro' | 'Objection Handler';
    customPrompt?: string;
  }): Promise<string> {
    const systemPrompt = `You are an elite enterprise B2B sales copywriter. Generate a concise, high-converting, professional email tailored to the lead details provided. Include subject line and body text.`;
    
    const userPrompt = `
Recipient Name: ${params.recipientName}
Company: ${params.company || 'N/A'}
Deal Value: ${params.dealValue ? `$${params.dealValue}` : 'N/A'}
Email Type: ${params.emailType}
Additional Context / Instructions: ${params.customPrompt || 'None'}

Please provide a clear Subject Line followed by the Email Body.
`;

    try {
      return await this.callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    } catch (err) {
      // Fallback template
      return `Subject: Re: Partnering with ${params.company || 'Your Team'} - Strategic Opportunities

Hi ${params.recipientName},

I hope this email finds you well. 

I've been following ${params.company || 'your company'}'s recent growth and wanted to reach out regarding how our AI-powered sales platform can streamline your pipeline velocity and revenue forecasting.

Would you have 15 minutes this Thursday for a brief introduction call?

Best regards,
Sales Team`;
    }
  }

  // 2. Summarize Meeting Notes & Action Items
  static async summarizeNotes(notes: string): Promise<string> {
    const systemPrompt = `You are an executive sales manager assistant. Analyze the raw meeting notes provided and output:
1. Executive Summary (2-3 sentences)
2. Key Takeaways & Discussion Points
3. Action Items with Assigned Owners & Due Dates
4. Next Steps & Recommended Deal Stage`;

    try {
      return await this.callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Raw Meeting Notes:\n${notes}` },
      ]);
    } catch (err) {
      return `### Executive Summary
Discussion covered deal scope, budget approvals, and timeline targets.

### Key Takeaways
- Client is aligned on feature requirements and user seat count.
- Internal procurement & legal approval requested before sign-off.

### Action Items
- [ ] Send revised proposal & product demo recording (Owner: Sales Rep)
- [ ] Schedule follow-up technical call (Owner: Solution Architect)`;
    }
  }

  // 3. Sales Copilot Conversational Chat
  static async chatCopilot(prompt: string, conversationHistory: { role: string; content: string }[] = []): Promise<string> {
    const systemPrompt = `You are "AI Sales Copilot", an expert AI assistant embedded inside an enterprise CRM SaaS platform. You give actionable advice on lead generation, deal qualification (BANT/MEDDPICC), sales negotiation strategies, email writing, and CRM productivity. Keep answers structured, friendly, and concise.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: prompt },
    ];

    try {
      return await this.callGroq(messages);
    } catch (err) {
      const lower = prompt.toLowerCase();
      if (lower.includes('lead') || lower.includes('dummy') || lower.includes('create') || lower.includes('software')) {
        return `### 🎯 Qualified Software Lead Concept

**Lead Name:** Aarav Mehta  
**Company:** NovaTech Solutions  
**Email:** aarav.mehta@example.com  
**Phone:** +91 90000 10001  
**Industry:** Enterprise Software & Technology  
**Status:** Qualified  
**Deal Value:** $25,000  

**Notes:** Client evaluated AI Copilot and requested a product demonstration next week along with enterprise user seat pricing breakdown. High interest in AI automated follow-up emails and meeting summarizer.`;
      }

      if (lower.includes('price') || lower.includes('objection') || lower.includes('budget')) {
        return `### 💡 Handling Price Objections

1. **Acknowledge & Validate:** "I understand budget alignment is critical for your team."
2. **Reframe to ROI:** Highlight time saved with AI meeting summaries & automated lead follow-ups.
3. **Isolate the Constraint:** Ask: *"Is price the only barrier, or are there specific features missing?"*
4. **Offer Options:** Propose phased seat rollouts or flexible billing terms.`;
      }

      return `Here is how I can assist with **"${prompt}"**:

1. **Lead Qualification:** Assess budget, authority, need, and timeline (BANT framework).
2. **Action Plan:** Schedule product demo, deliver customized proposal, and set follow-up reminder.
3. **Pipeline Velocity:** Focus on high-value qualified opportunities approaching expected close dates.

How else can I help optimize your sales workflow today?`;
    }
  }
}

export default AiService;

