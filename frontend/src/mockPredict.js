// Tạm thời dự đoán giả lập dựa trên 5 input cơ bản
export const predictMock = async (inputs) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const { total_assets, current_liabilities, long_term_debt, revenue, operating_cash_flow } = inputs;

      // Tính tỷ số cơ bản (convert to float)
      const ta = parseFloat(total_assets) || 1;
      const cl = parseFloat(current_liabilities) || 0;
      const ltd = parseFloat(long_term_debt) || 0;
      const rev = parseFloat(revenue) || 0;
      const ocf = parseFloat(operating_cash_flow) || 0;

      const total_debt = cl + ltd;
      const debt_to_assets = ta > 0 ? total_debt / ta : 1;
      const cfo_to_debt = total_debt > 0 ? ocf / total_debt : -0.5;
      const current_ratio = cl > 0 ? (ta - ltd) / cl : 2.0; // Approximation

      // Nội suy PD score (giả lập đơn giản)
      let score = 15; // Base score
      
      if (debt_to_assets > 0.6) score += 35;
      else if (debt_to_assets > 0.4) score += 15;
      
      if (cfo_to_debt < 0) score += 30;
      if (current_ratio < 1.0) score += 20;
      
      // Giới hạn 0 - 100
      score = Math.max(5, Math.min(98, score));
      
      let riskLevel = "Thấp";
      if (score >= 60) riskLevel = "Cao";
      else if (score >= 30) riskLevel = "Trung bình";
      
      resolve({
        pd_score: score,
        risk_level: riskLevel,
        top_factors: [
          { 
            feature: 'debt_to_assets', 
            label_vi: 'Nợ trên Tổng tài sản', 
            display_val: `${(debt_to_assets * 100).toFixed(1)}%`, 
            contribution: debt_to_assets > 0.5 ? 1.2 : -0.5 
          },
          { 
            feature: 'cfo_to_debt', 
            label_vi: 'Dòng tiền HĐKD / Tổng nợ', 
            display_val: `${(cfo_to_debt * 100).toFixed(1)}%`, 
            contribution: cfo_to_debt < 0 ? 0.9 : -0.6 
          },
          { 
            feature: 'current_ratio', 
            label_vi: 'Tỷ số thanh toán hiện hành', 
            display_val: `${current_ratio.toFixed(2)}`, 
            contribution: current_ratio < 1 ? 0.8 : -0.3 
          }
        ]
      });
    }, 800); // Fake delay
  });
};
