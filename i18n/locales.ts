// i18n/locales.ts
export const translations = {
  en: {
    // App Shell
    appTitle: "Business Decision Toolkit",
    appSubtitle: "AI-Powered Operations Management",
    queuingModuleTab: "Queuing Theory (M/M/s)",
    pertModuleTab: "PERT / CPM Analysis",

    // Queuing Module
    queuingTitle: "M/M/s Model Parameters",
    arrivalRateLabel: "Arrival Rate (λ)",
    serviceRateLabel: "Service Rate (μ)",
    serversLabel: "Number of Servers (s)",
    calculateButton: "Calculate",
    errorStableSystemMMS: "For a stable M/M/s system, total service rate (s * μ) must be greater than arrival rate (λ).",
    errorPositiveNumbers: "Arrival rate (λ), service rate (μ), and number of servers (s) must be positive numbers.",
    errorIntegerServers: "Number of servers (s) must be an integer.",
    resultsTitle: "Results",
    serverUtilization: "Server Utilization (ρ)",
    avgSystemCustomers: "Avg. System Customers (L)",
    avgQueueCustomers: "Avg. Queue Customers (Lq)",
    avgSystemTime: "Avg. System Time (W)",
    avgQueueTime: "Avg. Queue Time (Wq)",
    probSystemEmpty: "P(0) - System Empty",
    probDistributionTitle: "Probability Distribution P(n)",
    nColumn: "n",
    pnColumn: "P(n)",
    cumulativePnColumn: "Cumulative P(n)",
    getAiAnalysisButton: "Get AI Analysis & Insights",
    aiAnalysisTitle: "AI-Powered Analysis",
    aiPromptQueuing: `
      You are an expert in Operations Management.
      Analyze the following M/M/s queuing system results and provide actionable business insights.
      Explain the key metrics in simple terms and suggest potential improvements.

      System Parameters:
      - Arrival Rate (λ): {lambda} customers/unit of time
      - Service Rate per Server (μ): {mu} customers/unit of time
      - Number of Servers (s): {s}

      Calculated Metrics:
      - Server Utilization (ρ): {rho}%
      - Average number of customers in the system (L): {L}
      - Average number of customers in the queue (Lq): {Lq}
      - Average time a customer spends in the system (W): {W} units of time
      - Average time a customer spends in the queue (Wq): {Wq} units of time
      - Probability of the system being empty (P0): {P0}%

      Based on these results, what is the overall health of this queuing system? What are the main bottlenecks or inefficiencies? 
      Provide specific, practical recommendations for the business to improve customer experience and operational efficiency. 
      For example, should they consider adding/removing servers, improving service speed, or managing arrivals?
    `,

    // PERT Module
    pertTitle: "PERT/CPM Activities",
    addActivityButton: "Add Activity",
    removeButton: "Remove",
    analyzeProjectButton: "Analyze Project",
    predecessorsPlaceholder: "A,B",
    // Table Headers
    idHeader: "ID",
    predecessorsHeader: "Predecessors",
    optimisticHeader: "Optimistic (a)",
    mostLikelyHeader: "Most Likely (m)",
    pessimisticHeader: "Pessimistic (b)",
    normalCostHeader: "Normal Cost",
    crashTimeHeader: "Crash Time",
    crashCostHeader: "Crash Cost",
    // Analysis Results
    analysisTab: "PERT Analysis",
    crashingTab: "Crashing Analysis",
    analysisResultsTitle: "Analysis Results",
    projectDuration: "Project Duration (Te)",
    criticalPath: "Critical Path",
    projectVariance: "Project Variance",
    projectStdDev: "Project Std. Dev.",
    activityDetailsTitle: "Activity Details",
    networkDiagramTitle: "Project Network Diagram",
    // Activity Details Table Headers
    teHeader: "Te",
    varHeader: "Var",
    esHeader: "ES",
    efHeader: "EF",
    lsHeader: "LS",
    lfHeader: "LF",
    slackHeader: "Slack",
    // Crashing Analysis
    crashEfficiencyTitle: "Crash Cost Efficiency",
    crashChartTitle: "Cost to Reduce Duration by One Time Unit",
    costAxisLabel: "Cost ($)",
    activityAxisLabel: "Activity ID",
    targetDurationLabel: "Target Project Duration",
    calculateCrashingButton: "Calculate Crashing Plan",
    initialDuration: "Initial Duration",
    finalDuration: "Final Duration",
    totalCrashingCost: "Total Crashing Cost",
    crashingStepsTitle: "Crashing Steps",
    // Crashing Steps Table
    stepHeader: "Step",
    crashActivityHeader: "Crash Activity",
    stepCostHeader: "Step Cost",
    newDurationHeader: "New Duration",
    // Errors
    errorUniqueIds: "Activity IDs must be unique.",
    errorCircularDependency: "Circular dependency detected.",
    errorPredecessorNotFound: "Predecessor '{p}' for activity '{id}' not found.",
    errorEmptyId: "Activity ID cannot be empty.",
    errorNegativeDurations: "Error in Activity '{id}': Durations cannot be negative.",
    errorActivityTimesOrder: "Error in Activity '{id}': Durations must follow a <= m <= b.",
    errorCrashTimeGreater: "Error in Activity '{id}': Crash time cannot be greater than normal time.",
    errorCrashCostLower: "Error in Activity '{id}': Crash cost must be greater than or equal to normal cost.",
    errorNoCrashButCost: "Error in Activity '{id}': Activity cannot be crashed but has extra cost.",
    errorTargetDurationGreater: "Target duration must be less than the current project duration.",
    errorTargetDurationPositive: "Target duration must be a positive number.",
    errorCannotShortenFurther: "Cannot shorten further. No crashable activities on the critical path.",
    // AI Prompt PERT
    aiPromptPert: `
      You are an expert in Project Management and Operations Research.
      Analyze the following PERT analysis results for a project and provide actionable business insights.

      Project Summary:
      - Critical Path: {criticalPath}
      - Total Project Duration (Expected): {projectDuration}
      - Project Standard Deviation: {stdDev}

      Activity Details:
      {activitiesSummary}

      Based on these results:
      1. What is the significance of the critical path?
      2. Which non-critical activities have the most slack for resource allocation flexibility?
      3. Which activities have the highest variance and pose the greatest risk?
      4. Provide specific, practical recommendations for the project manager.
    `,
  },
  es: {
    // App Shell
    appTitle: "Kit de Herramientas de Decisión",
    appSubtitle: "Gestión de Operaciones con IA",
    queuingModuleTab: "Teoría de Colas (M/M/s)",
    pertModuleTab: "Análisis PERT / CPM",

    // Queuing Module
    queuingTitle: "Parámetros del Modelo M/M/s",
    arrivalRateLabel: "Tasa de Llegada (λ)",
    serviceRateLabel: "Tasa de Servicio (μ)",
    serversLabel: "Número de Servidores (s)",
    calculateButton: "Calcular",
    errorStableSystemMMS: "Para un sistema M/M/s estable, la tasa total de servicio (s * μ) debe ser mayor que la tasa de llegada (λ).",
    errorPositiveNumbers: "La tasa de llegada (λ), la tasa de servicio (μ) y el número de servidores (s) deben ser números positivos.",
    errorIntegerServers: "El número de servidores (s) debe ser un número entero.",
    resultsTitle: "Resultados",
    serverUtilization: "Utilización del Servidor (ρ)",
    avgSystemCustomers: "Nº Prom. Clientes en Sistema (L)",
    avgQueueCustomers: "Nº Prom. Clientes en Cola (Lq)",
    avgSystemTime: "Tiempo Prom. en Sistema (W)",
    avgQueueTime: "Tiempo Prom. en Cola (Wq)",
    probSystemEmpty: "P(0) - Sistema Vacío",
    probDistributionTitle: "Distribución de Probabilidad P(n)",
    nColumn: "n",
    pnColumn: "P(n)",
    cumulativePnColumn: "P(n) Acumulada",
    getAiAnalysisButton: "Obtener Análisis con IA",
    aiAnalysisTitle: "Análisis con Inteligencia Artificial",
    aiPromptQueuing: `
      Eres un experto en Gestión de Operaciones.
      Analiza los siguientes resultados del sistema de colas M/M/s y proporciona ideas de negocio accionables.
      Explica las métricas clave en términos sencillos y sugiere posibles mejoras.

      Parámetros del Sistema:
      - Tasa de Llegada (λ): {lambda} clientes/unidad de tiempo
      - Tasa de Servicio por Servidor (μ): {mu} clientes/unidad de tiempo
      - Número de Servidores (s): {s}

      Métricas Calculadas:
      - Utilización del Servidor (ρ): {rho}%
      - Número promedio de clientes en el sistema (L): {L}
      - Número promedio de clientes en la cola (Lq): {Lq}
      - Tiempo promedio que un cliente pasa en el sistema (W): {W} unidades de tiempo
      - Tiempo promedio que un cliente pasa en la cola (Wq): {Wq} unidades de tiempo
      - Probabilidad de que el sistema esté vacío (P0): {P0}%

      Basado en estos resultados, ¿cuál es la salud general de este sistema de colas? ¿Cuáles son los principales cuellos de botella o ineficiencias?
      Proporciona recomendaciones específicas y prácticas para que el negocio mejore la experiencia del cliente y la eficiencia operativa.
      Por ejemplo, ¿deberían considerar añadir/quitar servidores, mejorar la velocidad del servicio o gestionar las llegadas?
    `,

    // PERT Module
    pertTitle: "Actividades PERT/CPM",
    addActivityButton: "Añadir Actividad",
    removeButton: "Eliminar",
    analyzeProjectButton: "Analizar Proyecto",
    predecessorsPlaceholder: "A,B",
    // Table Headers
    idHeader: "ID",
    predecessorsHeader: "Predecesores",
    optimisticHeader: "Optimista (a)",
    mostLikelyHeader: "Más Probable (m)",
    pessimisticHeader: "Pesimista (b)",
    normalCostHeader: "Costo Normal",
    crashTimeHeader: "Tiempo Crash",
    crashCostHeader: "Costo Crash",
    // Analysis Results
    analysisTab: "Análisis PERT",
    crashingTab: "Análisis de Crashing",
    analysisResultsTitle: "Resultados del Análisis",
    projectDuration: "Duración del Proyecto (Te)",
    criticalPath: "Ruta Crítica",
    projectVariance: "Varianza del Proyecto",
    projectStdDev: "Desv. Est. del Proyecto",
    activityDetailsTitle: "Detalles de Actividad",
    networkDiagramTitle: "Diagrama de Red del Proyecto",
    // Activity Details Table Headers
    teHeader: "Te",
    varHeader: "Var",
    esHeader: "ES",
    efHeader: "EF",
    lsHeader: "LS",
    lfHeader: "LF",
    slackHeader: "Holgura",
    // Crashing Analysis
    crashEfficiencyTitle: "Eficiencia de Costo de Crashing",
    crashChartTitle: "Costo por Reducir la Duración en una Unidad",
    costAxisLabel: "Costo ($)",
    activityAxisLabel: "ID de Actividad",
    targetDurationLabel: "Duración Objetivo del Proyecto",
    calculateCrashingButton: "Calcular Plan de Crashing",
    initialDuration: "Duración Inicial",
    finalDuration: "Duración Final",
    totalCrashingCost: "Costo Total de Crashing",
    crashingStepsTitle: "Pasos de Crashing",
    // Crashing Steps Table
    stepHeader: "Paso",
    crashActivityHeader: "Actividad Acelerada",
    stepCostHeader: "Costo del Paso",
    newDurationHeader: "Nueva Duración",
    // Errors
    errorUniqueIds: "Los IDs de las actividades deben ser únicos.",
    errorCircularDependency: "Se detectó una dependencia circular.",
    errorPredecessorNotFound: "El predecesor '{p}' para la actividad '{id}' no fue encontrado.",
    errorEmptyId: "El ID de la actividad no puede estar vacío.",
    errorNegativeDurations: "Error en Actividad '{id}': Las duraciones no pueden ser negativas.",
    errorActivityTimesOrder: "Error en Actividad '{id}': Las duraciones deben seguir el orden a <= m <= b.",
    errorCrashTimeGreater: "Error en Actividad '{id}': El tiempo de crash no puede ser mayor al tiempo normal.",
    errorCrashCostLower: "Error en Actividad '{id}': El costo de crash debe ser mayor o igual al costo normal.",
    errorNoCrashButCost: "Error en Actividad '{id}': La actividad no puede ser acelerada pero tiene un costo extra.",
    errorTargetDurationGreater: "La duración objetivo debe ser menor que la duración actual del proyecto.",
    errorTargetDurationPositive: "La duración objetivo debe ser un número positivo.",
    errorCannotShortenFurther: "No se puede acortar más. No hay actividades acelerables en la ruta crítica.",
    // AI Prompt PERT
    aiPromptPert: `
      Eres un experto en Gestión de Proyectos e Investigación de Operaciones.
      Analiza los siguientes resultados del análisis PERT para un proyecto y proporciona ideas de negocio accionables.

      Resumen del Proyecto:
      - Ruta Crítica: {criticalPath}
      - Duración Total del Proyecto (Esperada): {projectDuration}
      - Desviación Estándar del Proyecto: {stdDev}

      Detalles de Actividades:
      {activitiesSummary}

      Basado en estos resultados:
      1. ¿Cuál es la importancia de la ruta crítica?
      2. ¿Qué actividades no críticas tienen la mayor holgura para flexibilidad en la asignación de recursos?
      3. ¿Qué actividades tienen la mayor varianza y representan el mayor riesgo?
      4. Proporciona recomendaciones específicas y prácticas para el director del proyecto.
    `,
  },
};
