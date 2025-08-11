require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

async function createFinalMockData() {
  console.log('🎭 Creating final mock data (messages only)...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // 1. Get exchange
    const { data: exchanges } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1);
    
    if (!exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found');
      return;
    }
    
    const exchange = exchanges[0];
    console.log(`📋 Using exchange: ${exchange.name || exchange.id}`);
    
    // 2. Get contacts for senders
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .limit(5);
    
    if (!contacts || contacts.length === 0) {
      console.log('❌ No contacts found for senders');
      return;
    }
    
    console.log(`👥 Found ${contacts.length} contacts for messages`);
    
    // 3. Create comprehensive messages (since this works)
    console.log('💬 Creating comprehensive message history...');
    
    const messageTemplates = [
      {
        content: '🎉 Welcome to your 1031 exchange process! I am excited to work with you on this transaction. This chat will be our primary communication channel throughout the exchange.',
        hours_ago: 8 * 24 // 8 days ago
      },
      {
        content: 'Thank you for the warm welcome! I have been looking forward to starting this exchange. I have reviewed the initial documentation you provided and everything looks comprehensive.',
        hours_ago: 7 * 24 + 2 // 7 days, 2 hours ago
      },
      {
        content: 'Excellent! I have just uploaded the fully executed exchange agreement with all required signatures. Please review at your convenience and let me know if you have any questions.',
        hours_ago: 6 * 24 // 6 days ago
      },
      {
        content: 'Perfect! The agreement looks great and all terms are exactly as we discussed. I have also uploaded the property deed for the relinquished property - it is PIN protected for security.',
        hours_ago: 5 * 24 + 3 // 5 days, 3 hours ago
      },
      {
        content: '📋 Quick update: The relinquished property sale has closed successfully. We are now officially in the 45-day identification period. The clock is ticking!',
        hours_ago: 4 * 24 // 4 days ago
      },
      {
        content: 'Great news about the closing! I have been actively researching replacement properties and have identified several promising options. Should we schedule a call to discuss the top candidates?',
        hours_ago: 3 * 24 + 5 // 3 days, 5 hours ago
      },
      {
        content: '🎯 SUCCESS! The 45-day identification notice has been officially submitted with our selected replacement properties. We are now in the 180-day exchange period.',
        hours_ago: 2 * 24 // 2 days ago
      },
      {
        content: 'Fantastic work on getting that notice submitted on time! I have uploaded the complete identification documentation and property analysis reports for our selected properties.',
        hours_ago: 1 * 24 + 8 // 1 day, 8 hours ago
      },
      {
        content: 'The financial analysis looks very promising, especially for Property B. I have some questions about the financing structure and would like to explore our options further.',
        hours_ago: 1 * 24 // 1 day ago
      },
      {
        content: 'I have updated the financial projections with the latest market data and financing terms. The numbers are looking even better than our initial estimates!',
        hours_ago: 16 // 16 hours ago
      },
      {
        content: '📅 I have scheduled property inspections for all three replacement properties next week. The inspection reports will be crucial for our final selection decision.',
        hours_ago: 12 // 12 hours ago
      },
      {
        content: 'Perfect timing on the inspections! I am available throughout next week to accompany the inspectors if needed. Would you recommend being present for any specific properties?',
        hours_ago: 10 // 10 hours ago
      },
      {
        content: 'I would definitely recommend being present for Property B and Property C inspections - those are our top candidates and your input would be valuable.',
        hours_ago: 8 // 8 hours ago
      },
      {
        content: '💰 Quick financial update: I have secured preliminary approval for the financing at better rates than expected. This should improve our cash flow projections significantly.',
        hours_ago: 6 // 6 hours ago
      },
      {
        content: 'That is excellent news about the financing! Better rates will make a big difference in the long-term returns. Can you send me the updated terms for review?',
        hours_ago: 4 // 4 hours ago
      },
      {
        content: 'Absolutely! I will have the updated financing package ready for you by tomorrow morning. It includes multiple options for your consideration.',
        hours_ago: 3 // 3 hours ago
      },
      {
        content: '📊 I have also prepared a comprehensive comparison chart of all three replacement properties with updated financial projections. This should help with the final decision.',
        hours_ago: 2 // 2 hours ago
      },
      {
        content: 'Thank you for being so thorough with the documentation! Your attention to detail gives me great confidence in this exchange process.',
        hours_ago: 1 // 1 hour ago
      },
      {
        content: '🚀 We are making excellent progress and staying ahead of all critical deadlines. I will send you a detailed timeline update later today with our next steps.',
        hours_ago: 0.5 // 30 minutes ago
      }
    ];
    
    let messageCount = 0;
    for (let i = 0; i < messageTemplates.length; i++) {
      const template = messageTemplates[i];
      const senderIndex = i % contacts.length;
      
      const message = {
        id: uuidv4(),
        content: template.content,
        sender_id: contacts[senderIndex].id,
        exchange_id: exchange.id,
        created_at: new Date(Date.now() - template.hours_ago * 60 * 60 * 1000).toISOString()
      };
      
      const { error } = await supabase
        .from('messages')
        .insert([message]);
      
      if (error) {
        console.error(`Error creating message ${i + 1}:`, error.message);
      } else {
        messageCount++;
      }
    }
    
    console.log(`✅ Successfully created ${messageCount} messages`);
    
    // 4. Update exchange with better overview data
    console.log('🏢 Updating exchange overview...');
    
    const { error: updateError } = await supabase
      .from('exchanges')
      .update({
        name: exchange.name || 'Premium Commercial 1031 Exchange - Downtown Dallas',
        relinquished_property_value: 1250000.00,
        replacement_property_value: 1450000.00,
        cash_boot: 25000.00,
        financing_amount: 950000.00,
        sale_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        identification_deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
        exchange_deadline: new Date(Date.now() + 170 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        priority: 'high',
        completion_percentage: 65,
        notes: 'High-value commercial exchange progressing smoothly. Client is experienced investor with strong financing. Property inspections scheduled for next week.',
        updated_at: new Date().toISOString()
      })
      .eq('id', exchange.id);
    
    if (updateError) {
      console.error('Error updating exchange:', updateError.message);
    } else {
      console.log('✅ Updated exchange overview data');
    }
    
    console.log('\n🎉 FINAL MOCK DATA CREATION COMPLETE!');
    console.log('\n📊 Results:');
    console.log(`   🏢 Exchange: Enhanced with rich overview data`);
    console.log(`   💬 Messages: ${messageCount} comprehensive conversation messages`);
    console.log(`   📈 Progress: Exchange shows 65% completion`);
    console.log(`   💰 Financial: $1.25M → $1.45M property values`);
    console.log(`   ⏰ Timeline: 35 days left for property acquisition`);
    
    console.log('\n✨ Your exchange now has:');
    console.log('   • Rich conversation history in Messages tab');
    console.log('   • Detailed overview with progress indicators');
    console.log('   • Financial data with cash boot and financing');
    console.log('   • Realistic timeline with approaching deadlines');
    
    console.log('\n🔄 Refresh your exchange detail page to see the enhanced content!');
    
  } catch (error) {
    console.error('❌ Error creating final mock data:', error);
  }
}

// Run the final mock data creation
if (require.main === module) {
  createFinalMockData().catch(console.error);
}

module.exports = createFinalMockData;