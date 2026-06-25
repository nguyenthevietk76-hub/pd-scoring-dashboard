import React, { createContext, useState } from 'react';

export const AnalysisContext = createContext();

export const AnalysisProvider = ({ children }) => {
  const [analysisContext, setAnalysisContext] = useState(null);

  const updateAnalysisContext = (result, formData = null) => {
    if (!result) {
      setAnalysisContext(null);
      return;
    }

    setAnalysisContext({
      company_name: result.companyName || result.company_name || 'Doanh nghiệp Chưa rõ tên',
      sector: result.sector || null,
      pd_score_pct: typeof result.pd_score === 'number' ? result.pd_score : result.pd_score_pct,
      risk_level_vi: result.risk_level || result.risk_level_vi || 'Chưa rõ',
      top_factors: result.top_factors || [],
      pd_scores_4q: result.pd_scores_4q || [],
      total_assets_b: formData && formData.total_assets ? parseFloat(formData.total_assets) : (result.total_assets_b || null)
    });
  };

  return (
    <AnalysisContext.Provider value={{ analysisContext, setAnalysisContext, updateAnalysisContext }}>
      {children}
    </AnalysisContext.Provider>
  );
};
