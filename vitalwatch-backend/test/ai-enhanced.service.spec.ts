import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIEnhancedService } from '../src/ai/ai-enhanced.service';
import { AuditService } from '../src/audit/audit.service';

describe('AIEnhancedService', () => {
  let service: AIEnhancedService;
  let configService: ConfigService;
  let auditService: AuditService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  // Mock OpenAI responses
  const mockOpenAIResponse = {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'This is a mock AI response',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 30,
      total_tokens: 80,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIEnhancedService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AIEnhancedService>(AIEnhancedService);
    configService = module.get<ConfigService>(ConfigService);
    auditService = module.get<AuditService>(AuditService);

    mockConfigService.get.mockReturnValue('test-api-key');
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeConversation', () => {
    it('should analyze patient-provider conversation', async () => {
      // Arrange
      const messages = [
        {
          role: 'patient',
          content: "I've been experiencing chest pain for the last two days",
        },
        {
          role: 'provider',
          content: 'Can you describe the pain? Is it sharp or dull?',
        },
        {
          role: 'patient',
          content: "It's a sharp pain that comes and goes",
        },
      ];

      // Mock OpenAI API call
      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue({
        analysis: {
          symptoms: ['chest pain'],
          severity: 'moderate',
          urgency: 'high',
          suggestedQuestions: [
            'Have you experienced shortness of breath?',
            'Does the pain radiate to your arm or jaw?',
          ],
          redFlags: ['chest pain'],
        },
      });

      // Act
      const result = await service.analyzeConversation(messages);

      // Assert
      expect(result).toBeDefined();
      expect(result.symptoms).toContain('chest pain');
      expect(result.severity).toBe('moderate');
      expect(result.urgency).toBe('high');
      expect(result.redFlags).toContain('chest pain');
    });

    it('should create audit log for AI analysis', async () => {
      // Arrange
      const messages = [
        { role: 'patient', content: 'I have a headache' },
        { role: 'provider', content: 'How long have you had it?' },
      ];

      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue({
        analysis: { symptoms: ['headache'], severity: 'mild' },
      });

      // Act
      await service.analyzeConversation(messages, 'provider-123');

      // Assert
      expect(auditService.log).toHaveBeenCalledWith({
        action: 'AI_ANALYSIS',
        userId: 'provider-123',
        resourceType: 'conversation',
        details: expect.any(Object),
      });
    });
  });

  describe('generateClinicalSummary', () => {
    it('should generate clinical summary from vitals and notes', async () => {
      // Arrange
      const patientData = {
        vitals: [
          { type: 'blood_pressure', value: '140/90', timestamp: new Date() },
          { type: 'heart_rate', value: '85', timestamp: new Date() },
          { type: 'temperature', value: '98.6', timestamp: new Date() },
        ],
        symptoms: ['headache', 'fatigue'],
        medications: ['Lisinopril 10mg'],
        recentNotes: [
          'Patient reports feeling better',
          'Blood pressure slightly elevated',
        ],
      };

      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue({
        summary:
          'Patient shows slight elevation in blood pressure (140/90) with current medication regimen. Reports improvement in symptoms but continues to experience headache and fatigue.',
        keyFindings: ['Elevated BP', 'Persistent headache'],
        recommendations: [
          'Monitor blood pressure daily',
          'Consider medication adjustment',
        ],
      });

      // Act
      const result = await service.generateClinicalSummary(patientData);

      // Assert
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.keyFindings).toContain('Elevated BP');
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('suggestDifferentialDiagnosis', () => {
    it('should suggest differential diagnoses based on symptoms', async () => {
      // Arrange
      const symptoms = ['chest pain', 'shortness of breath', 'fatigue'];
      const patientHistory = {
        age: 55,
        gender: 'male',
        conditions: ['hypertension'],
        medications: ['Lisinopril'],
      };

      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue({
        differentials: [
          {
            condition: 'Coronary Artery Disease',
            probability: 'high',
            reasoning: 'Chest pain with dyspnea in patient with hypertension',
          },
          {
            condition: 'Heart Failure',
            probability: 'moderate',
            reasoning: 'Fatigue and shortness of breath',
          },
        ],
        urgentCareRecommendation: true,
        suggestedTests: ['EKG', 'Troponin', 'Chest X-ray'],
      });

      // Act
      const result = await service.suggestDifferentialDiagnosis(symptoms, patientHistory);

      // Assert
      expect(result).toBeDefined();
      expect(result.differentials).toHaveLength(2);
      expect(result.urgentCareRecommendation).toBe(true);
      expect(result.suggestedTests).toContain('EKG');
    });
  });

  describe('generatePatientEducation', () => {
    it('should generate patient-friendly education content', async () => {
      // Arrange
      const topic = 'hypertension';
      const patientLevel = 'beginner';

      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue({
        content: {
          title: 'Understanding High Blood Pressure',
          summary:
            'High blood pressure (hypertension) is when the force of blood against artery walls is too high.',
          keyPoints: [
            'Often has no symptoms',
            'Can lead to serious health problems',
            'Can be managed with lifestyle changes and medication',
          ],
          whatToDo: [
            'Take medications as prescribed',
            'Reduce salt intake',
            'Exercise regularly',
            'Monitor blood pressure at home',
          ],
          whenToSeekHelp: [
            'Blood pressure above 180/120',
            'Severe headache',
            'Chest pain',
          ],
        },
      });

      // Act
      const result = await service.generatePatientEducation(topic, patientLevel);

      // Assert
      expect(result).toBeDefined();
      expect(result.content.title).toBe('Understanding High Blood Pressure');
      expect(result.content.keyPoints).toBeDefined();
      expect(result.content.whatToDo).toBeDefined();
    });
  });

  describe('analyzeMedicationAdherence', () => {
    it('should analyze medication adherence patterns', async () => {
      // Arrange
      const adherenceData = {
        patientId: 'patient-123',
        medicationName: 'Metformin',
        logs: [
          { date: '2024-01-01', taken: true, onTime: true },
          { date: '2024-01-02', taken: true, onTime: false },
          { date: '2024-01-03', taken: false, onTime: false },
          { date: '2024-01-04', taken: true, onTime: true },
          { date: '2024-01-05', taken: true, onTime: true },
        ],
      };

      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue({
        adherenceRate: 80,
        patterns: [
          'Patient tends to skip doses on weekends',
          'Better adherence in the morning',
        ],
        barriers: ['Forgetfulness', 'Schedule conflicts'],
        suggestions: [
          'Set daily phone reminders',
          'Use pill organizer',
          'Link medication to daily routine',
        ],
      });

      // Act
      const result = await service.analyzeMedicationAdherence(adherenceData);

      // Assert
      expect(result).toBeDefined();
      expect(result.adherenceRate).toBe(80);
      expect(result.patterns).toBeDefined();
      expect(result.suggestions).toContain('Set daily phone reminders');
    });
  });

  describe('generateProgressNote', () => {
    it('should generate structured progress note from encounter', async () => {
      // Arrange
      const encounterData = {
        chiefComplaint: 'Follow-up for hypertension',
        vitals: { bp: '138/88', hr: '76', temp: '98.6' },
        symptoms: [],
        assessment: 'Hypertension improving',
        medications: ['Lisinopril 10mg daily'],
      };

      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue({
        soap: {
          subjective:
            'Patient presents for hypertension follow-up. Reports compliance with medications.',
          objective: 'BP 138/88, HR 76, Temp 98.6°F. No acute distress.',
          assessment: 'Hypertension, improved control on current regimen.',
          plan: 'Continue Lisinopril 10mg daily. Follow-up in 3 months. Monitor BP at home.',
        },
      });

      // Act
      const result = await service.generateProgressNote(encounterData);

      // Assert
      expect(result).toBeDefined();
      expect(result.soap.subjective).toBeDefined();
      expect(result.soap.objective).toBeDefined();
      expect(result.soap.assessment).toBeDefined();
      expect(result.soap.plan).toBeDefined();
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies in vital signs', async () => {
      // Arrange
      const vitalsHistory = [
        { type: 'blood_pressure', value: '120/80', date: '2024-01-01' },
        { type: 'blood_pressure', value: '125/82', date: '2024-01-02' },
        { type: 'blood_pressure', value: '180/110', date: '2024-01-03' }, // Anomaly
        { type: 'blood_pressure', value: '122/80', date: '2024-01-04' },
      ];

      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue({
        anomalies: [
          {
            date: '2024-01-03',
            type: 'blood_pressure',
            value: '180/110',
            severity: 'high',
            deviation: 'Significant spike from baseline',
            possibleCauses: ['Medication non-compliance', 'Stress', 'White coat syndrome'],
            recommendation: 'Immediate follow-up required',
          },
        ],
        trend: 'stable',
        overallRisk: 'moderate',
      });

      // Act
      const result = await service.detectAnomalies(vitalsHistory);

      // Assert
      expect(result).toBeDefined();
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0].severity).toBe('high');
      expect(result.trend).toBe('stable');
    });
  });

  describe('generateResponseSuggestions', () => {
    it('should suggest provider responses to patient messages', async () => {
      // Arrange
      const patientMessage = 'I forgot to take my medication yesterday. What should I do?';
      const context = {
        medication: 'Lisinopril 10mg',
        condition: 'Hypertension',
      };

      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue({
        suggestions: [
          {
            tone: 'professional',
            response:
              'Missing one dose occasionally is not critical. Take your regular dose today as scheduled. Do not take a double dose to make up for the missed one. If you continue to have trouble remembering, we can discuss reminder strategies.',
          },
          {
            tone: 'empathetic',
            response:
              "I understand it can be challenging to remember medications. Don't worry about the missed dose - just continue with your regular schedule today. Let's work together to find a reminder system that works for you.",
          },
        ],
      });

      // Act
      const result = await service.generateResponseSuggestions(patientMessage, context);

      // Assert
      expect(result).toBeDefined();
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].tone).toBe('professional');
    });
  });

  describe('predictPatientRisk', () => {
    it('should predict patient health risks', async () => {
      // Arrange
      const patientData = {
        age: 65,
        conditions: ['diabetes', 'hypertension'],
        vitals: {
          recentBP: '145/92',
          recentBG: '185',
        },
        adherence: 75,
        lastVisit: 90, // days ago
      };

      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue({
        riskScore: 7.5,
        riskLevel: 'moderate-high',
        factors: [
          'Suboptimal medication adherence',
          'Elevated blood glucose',
          'Prolonged time since last visit',
        ],
        recommendations: [
          'Schedule follow-up appointment within 2 weeks',
          'Increase monitoring frequency',
          'Review medication adherence barriers',
        ],
        predictedOutcomes: {
          hospitalization: 'moderate',
          complicationDevelopment: 'moderate-high',
        },
      });

      // Act
      const result = await service.predictPatientRisk(patientData);

      // Assert
      expect(result).toBeDefined();
      expect(result.riskScore).toBe(7.5);
      expect(result.riskLevel).toBe('moderate-high');
      expect(result.factors).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      // Arrange
      jest
        .spyOn(service as any, 'callOpenAI')
        .mockRejectedValue(new Error('OpenAI API error'));

      // Act & Assert
      await expect(service.analyzeConversation([])).rejects.toThrow();
    });

    it('should handle rate limiting', async () => {
      // Arrange
      const error = new Error('Rate limit exceeded');
      (error as any).status = 429;
      jest.spyOn(service as any, 'callOpenAI').mockRejectedValue(error);

      // Act & Assert
      await expect(service.analyzeConversation([])).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('privacy and compliance', () => {
    it('should redact PHI before sending to AI service', async () => {
      // Arrange
      const messages = [
        {
          role: 'patient',
          content: 'My name is John Doe and my SSN is 123-45-6789',
        },
      ];

      const callOpenAISpy = jest
        .spyOn(service as any, 'callOpenAI')
        .mockResolvedValue({ analysis: {} });

      // Act
      await service.analyzeConversation(messages);

      // Assert
      const calledWith = callOpenAISpy.mock.calls[0][0];
      expect(calledWith).not.toContain('John Doe');
      expect(calledWith).not.toContain('123-45-6789');
    });
  });
});
