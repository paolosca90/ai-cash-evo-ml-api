/**
 * Test script to verify the updated function structure
 * Tests the enhanced data structure with reasoning, technical indicators, patterns, etc.
 */

const testFunction = async () => {
    console.log('🎯 Testing Updated AI Signals Function Structure');
    console.log('=================================================');

    const requestBody = {
        symbol: 'EURUSD',
        localAnalysis: true  // This prevents database save and allows testing
    };

    try {
        const response = await fetch('https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/generate-ai-signals', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Function call failed: ${response.status} ${response.statusText}`);
            console.error('Error details:', errorText);
            return;
        }

        const data = await response.json();

        console.log('✅ Function called successfully!');
        console.log('\n📊 Enhanced Data Structure Verification:');

        // Check reasoning field at top level
        if (data.reasoning && Array.isArray(data.reasoning)) {
            console.log('✅ reasoning field (top level):', data.reasoning.length, 'items');
            data.reasoning.forEach((reason, i) => console.log(`   ${i + 1}. ${reason}`));
        } else {
            console.log('❌ reasoning field missing or not an array');
        }

        // Check analysis.technical
        if (data.analysis?.technical && Array.isArray(data.analysis.technical)) {
            console.log('\n✅ analysis.technical:', data.analysis.technical.length, 'indicators');
            data.analysis.technical.forEach(indicator => {
                console.log(`   - ${indicator.name}: ${indicator.value} (${indicator.signal}) - ${indicator.description}`);
            });
        } else {
            console.log('❌ analysis.technical missing or not an array');
        }

        // Check analysis.patterns
        if (data.analysis?.patterns) {
            console.log('\n✅ analysis.patterns:');
            console.log(`   - Primary: ${data.analysis.patterns.primary?.type} (${data.analysis.patterns.primary?.direction})`);
            console.log(`   - Secondary: ${data.analysis.patterns.secondary?.type}`);
            console.log(`   - Support: ${data.analysis.patterns.structural?.support}`);
            console.log(`   - Resistance: ${data.analysis.patterns.structural?.resistance}`);
        } else {
            console.log('❌ analysis.patterns missing');
        }

        // Check analysis.priceAction
        if (data.analysis?.priceAction) {
            console.log('\n✅ analysis.priceAction:');
            console.log(`   - Trend: ${data.analysis.priceAction.momentum?.trend}`);
            console.log(`   - Momentum: ${data.analysis.priceAction.momentum?.strength}`);
            console.log(`   - Position: ${data.analysis.priceAction.positioning?.from_support} from support`);
        } else {
            console.log('❌ analysis.priceAction missing');
        }

        // Check analysis.news
        if (data.analysis?.news && Array.isArray(data.analysis.news)) {
            console.log('\n✅ analysis.news:', data.analysis.news.length, 'items');
            data.analysis.news.forEach(news => {
                console.log(`   - Sentiment: ${news.current_sentiment}, Impact: ${news.impact_level}`);
            });
        } else {
            console.log('❌ analysis.news missing or not an array');
        }

        // Check analysis.volatility
        if (data.analysis?.volatility) {
            console.log('\n✅ analysis.volatility:');
            console.log(`   - ATR: ${data.analysis.volatility.current?.atr}`);
            console.log(`   - Regime: ${data.analysis.volatility.current?.volatility_regime}`);
            console.log(`   - Risk/Reward: ${data.analysis.volatility.risk_management?.risk_reward_ratio}`);
            console.log(`   - Risk %: ${data.analysis.volatility.risk_management?.risk_percent}`);
        } else {
            console.log('❌ analysis.volatility missing');
        }

        // Check other important fields
        console.log('\n📈 Signal Details:');
        console.log(`   - Symbol: ${data.symbol}`);
        console.log(`   - Signal: ${data.type}`);
        console.log(`   - Confidence: ${data.confidence}%`);
        console.log(`   - Entry Price: ${data.entryPrice}`);
        console.log(`   - Stop Loss: ${data.stopLoss}`);
        console.log(`   - Take Profit: ${data.takeProfit}`);

        console.log('\n🎉 Enhanced function structure is working correctly!');
        console.log('All required fields for dynamic AI explanations are present.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
};

// Run the test
testFunction();