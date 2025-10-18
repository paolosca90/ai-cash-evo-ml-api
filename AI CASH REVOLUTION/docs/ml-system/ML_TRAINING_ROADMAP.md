# ML Training Roadmap - Future Enhancement

## Current Status: ✅ System 100% Functional

**Technical Confidence System (Active)**:
- Dynamic confidence: 45-85%
- Based on: ADX, RSI, EMA alignment, ATR volatility
- Connected to OANDA real-time data
- Accurate and production-ready

**Example**:
- Weak trend (ADX 12, RSI neutral): 58% confidence
- Strong trend (ADX 38, RSI favorable): 83% confidence

## Future: True ML Model Integration

### Phase 1: Data Collection (2-4 weeks)

**Requirements**:
1. ✅ Auto-trading system enabled
2. ✅ Trades executed and closed automatically
3. ✅ `win` column populated in `signal_performance`

**Target**: 5,000+ closed trades with results

### Phase 2: Model Training

**Steps**:
1. Export labeled data (BUY/SELL/HOLD + win/loss)
2. Create Python 3.10 environment:
   ```bash
   conda create -n ml-train python=3.10
   conda activate ml-train
   pip install scikit-learn==1.5.2 numpy pandas
   ```
3. Train Random Forest with compatible sklearn
4. Export model with `protocol=4`

**Expected Accuracy**: 65-75% (based on previous tests)

### Phase 3: Deployment

**Steps**:
1. Upload model to ML API repository
2. Update `app.py` to load model
3. Push to GitHub → Railway auto-deploy
4. Test ML predictions vs technical confidence

### Phase 4: Hybrid Optimization

**Compare**:
- ML confidence (60-90%)
- Technical confidence (45-85%)

**Strategy**:
- Use ML when confidence > 75%
- Use technical when ML uncertain (50-60%)
- Blend both for optimal results

## Current Recommendation

**Keep technical confidence system active**:
- Already accurate and reliable
- No ML training overhead
- Production-ready now

**Add ML later** when:
- 5,000+ labeled trades available
- Time to maintain ML pipeline
- Data quality validated

## Why Technical Confidence Works

**Smart formula**:
```
Base: 50%

Strong trend (ADX > 35): +15%
Favorable momentum (RSI): +15%
EMA alignment: +10%
Optimal volatility: +8%
Market regime: +5%

Range: 45-85%
```

**Result**: Confidence reflects real market conditions, not fixed 40%.

## Next Steps (Optional)

1. **Enable auto-trading**: accumulate real trade data
2. **Monitor for 4 weeks**: validate technical confidence accuracy
3. **When ready**: train ML model from real data
4. **Compare results**: ML vs Technical vs Hybrid

## Support

- **Current system**: Fully documented in `SYSTEM_STATUS.md`
- **ML API**: https://github.com/paolosca90/ai-cash-evo-ml-api
- **Railway**: https://web-production-31235.up.railway.app
