import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsentTemplate, PatientConsent, ConsentStatus, ConsentType } from './entities/consent.entity';
import {
  CreateConsentTemplateDto,
  UpdateConsentTemplateDto,
  SendConsentDto,
  SignConsentDto,
  WitnessConsentDto,
  GuardianSignConsentDto,
  RevokeConsentDto,
  ConsentFilterDto,
} from './dto/consent.dto';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    @InjectRepository(ConsentTemplate)
    private readonly templateRepository: Repository<ConsentTemplate>,
    @InjectRepository(PatientConsent)
    private readonly consentRepository: Repository<PatientConsent>,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  async createTemplate(dto: CreateConsentTemplateDto, user: CurrentUserPayload): Promise<ConsentTemplate> {
    const template = this.templateRepository.create({
      ...dto,
      organizationId: user.organizationId,
    });

    const saved = await this.templateRepository.save(template);

    await this.auditService.log({
      action: 'CONSENT_TEMPLATE_CREATED',
      userId: user.sub,
      resourceType: 'consent_template',
      resourceId: saved.id,
      details: { name: dto.name, type: dto.type },
    });

    return saved;
  }

  async findAllTemplates(user: CurrentUserPayload) {
    const query = this.templateRepository.createQueryBuilder('template')
      .where('template.isActive = :active', { active: true });

    if (user.role !== UserRole.SUPERADMIN) {
      query.andWhere('(template.organizationId = :orgId OR template.organizationId IS NULL)', {
        orgId: user.organizationId,
      });
    }

    return query.orderBy('template.type').addOrderBy('template.name').getMany();
  }

  async findTemplateById(id: string): Promise<ConsentTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Consent template not found');
    }
    return template;
  }

  async updateTemplate(id: string, dto: UpdateConsentTemplateDto, user: CurrentUserPayload): Promise<ConsentTemplate> {
    const template = await this.findTemplateById(id);

    if (template.organizationId && template.organizationId !== user.organizationId && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Cannot modify this template');
    }

    Object.assign(template, dto);
    const saved = await this.templateRepository.save(template);

    await this.auditService.log({
      action: 'CONSENT_TEMPLATE_UPDATED',
      userId: user.sub,
      resourceType: 'consent_template',
      resourceId: id,
    });

    return saved;
  }

  async sendConsent(dto: SendConsentDto, user: CurrentUserPayload, ip?: string, userAgent?: string): Promise<PatientConsent> {
    const template = await this.findTemplateById(dto.templateId);

    const existingActive = await this.consentRepository.findOne({
      where: {
        patientId: dto.patientId,
        type: template.type,
        status: ConsentStatus.SIGNED,
      },
    });

    if (existingActive && !existingActive.expiresAt) {
      throw new BadRequestException('Patient already has an active consent of this type');
    }

    const expiresAt = template.expirationDays
      ? new Date(Date.now() + template.expirationDays * 24 * 60 * 60 * 1000)
      : null;

    const consent = this.consentRepository.create({
      patientId: dto.patientId,
      templateId: dto.templateId,
      type: template.type,
      version: template.version,
      consentContent: template.content,
      status: ConsentStatus.PENDING,
      expiresAt,
      organizationId: user.organizationId,
      customFields: dto.customFields,
    });

    const saved = await this.consentRepository.save(consent);

    await this.auditService.log({
      action: 'CONSENT_SENT',
      userId: user.sub,
      resourceType: 'patient_consent',
      resourceId: saved.id,
      details: { patientId: dto.patientId, type: template.type },
    });

    this.logger.log(`Consent sent to patient ${dto.patientId}: ${template.type}`);
    return saved;
  }

  async signConsent(id: string, dto: SignConsentDto, user: CurrentUserPayload, ip?: string, userAgent?: string): Promise<PatientConsent> {
    const consent = await this.findConsentById(id);

    if (consent.status !== ConsentStatus.PENDING) {
      throw new BadRequestException('This consent cannot be signed');
    }

    if (consent.patientId !== user.sub && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only the patient can sign this consent');
    }

    consent.signatureData = dto.signatureData;
    consent.signedAt = new Date();
    consent.signatureIp = ip;
    consent.signatureUserAgent = userAgent;
    consent.customFields = { ...consent.customFields, ...dto.customFields };

    const template = await this.findTemplateById(consent.templateId);
    if (template.requiresWitness || template.requiresGuardian) {
      consent.status = ConsentStatus.PENDING;
    } else {
      consent.status = ConsentStatus.SIGNED;
    }

    const saved = await this.consentRepository.save(consent);

    await this.auditService.log({
      action: 'CONSENT_SIGNED',
      userId: user.sub,
      resourceType: 'patient_consent',
      resourceId: id,
      details: { ip, type: consent.type },
    });

    this.logger.log(`Consent signed: ${id} by patient ${consent.patientId}`);
    return saved;
  }

  async witnessConsent(id: string, dto: WitnessConsentDto, user: CurrentUserPayload): Promise<PatientConsent> {
    const consent = await this.findConsentById(id);

    if (!consent.signedAt) {
      throw new BadRequestException('Patient must sign first');
    }

    if (user.role !== UserRole.PROVIDER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only providers can witness consents');
    }

    consent.witnessId = user.sub;
    consent.witnessSignedAt = new Date();

    const template = await this.findTemplateById(consent.templateId);
    if (!template.requiresGuardian || consent.guardianSignature) {
      consent.status = ConsentStatus.SIGNED;
    }

    const saved = await this.consentRepository.save(consent);

    await this.auditService.log({
      action: 'CONSENT_WITNESSED',
      userId: user.sub,
      resourceType: 'patient_consent',
      resourceId: id,
    });

    return saved;
  }

  async guardianSign(id: string, dto: GuardianSignConsentDto, user: CurrentUserPayload): Promise<PatientConsent> {
    const consent = await this.findConsentById(id);

    consent.guardianName = dto.guardianName;
    consent.guardianRelationship = dto.guardianRelationship;
    consent.guardianSignature = dto.guardianSignature;

    const template = await this.findTemplateById(consent.templateId);
    if (!template.requiresWitness || consent.witnessSignedAt) {
      consent.status = ConsentStatus.SIGNED;
    }

    const saved = await this.consentRepository.save(consent);

    await this.auditService.log({
      action: 'CONSENT_GUARDIAN_SIGNED',
      userId: user.sub,
      resourceType: 'patient_consent',
      resourceId: id,
      details: { guardianName: dto.guardianName },
    });

    return saved;
  }

  async revokeConsent(id: string, dto: RevokeConsentDto, user: CurrentUserPayload): Promise<PatientConsent> {
    const consent = await this.findConsentById(id);

    if (consent.status !== ConsentStatus.SIGNED) {
      throw new BadRequestException('Only signed consents can be revoked');
    }

    if (consent.patientId !== user.sub && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only the patient or admin can revoke this consent');
    }

    consent.status = ConsentStatus.REVOKED;
    consent.revokedAt = new Date();
    consent.revokedBy = user.sub;
    consent.revocationReason = dto.reason;

    const saved = await this.consentRepository.save(consent);

    await this.auditService.log({
      action: 'CONSENT_REVOKED',
      userId: user.sub,
      resourceType: 'patient_consent',
      resourceId: id,
      details: { reason: dto.reason },
    });

    this.logger.log(`Consent revoked: ${id} by ${user.sub}`);
    return saved;
  }

  async findConsentById(id: string): Promise<PatientConsent> {
    const consent = await this.consentRepository.findOne({
      where: { id },
      relations: ['patient', 'template', 'witness'],
    });
    if (!consent) {
      throw new NotFoundException('Consent not found');
    }
    return consent;
  }

  async findPatientConsents(patientId: string, user: CurrentUserPayload) {
    if (user.role === UserRole.PATIENT && user.sub !== patientId) {
      throw new ForbiddenException('Access denied');
    }

    return this.consentRepository.find({
      where: { patientId },
      relations: ['template'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllConsents(filters: ConsentFilterDto, user: CurrentUserPayload) {
    const { page = 1, limit = 20, patientId, type, status } = filters;
    const skip = (page - 1) * limit;

    const query = this.consentRepository.createQueryBuilder('consent')
      .leftJoinAndSelect('consent.patient', 'patient')
      .leftJoinAndSelect('consent.template', 'template');

    if (user.role !== UserRole.SUPERADMIN) {
      query.andWhere('consent.organizationId = :orgId', { orgId: user.organizationId });
    }

    if (patientId) {
      query.andWhere('consent.patientId = :patientId', { patientId });
    }

    if (type) {
      query.andWhere('consent.type = :type', { type });
    }

    if (status) {
      query.andWhere('consent.status = :status', { status });
    }

    const [consents, total] = await query
      .orderBy('consent.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: consents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConsentStatus(patientId: string, type: ConsentType): Promise<{ hasConsent: boolean; consent?: PatientConsent }> {
    const consent = await this.consentRepository.findOne({
      where: {
        patientId,
        type,
        status: ConsentStatus.SIGNED,
      },
      order: { signedAt: 'DESC' },
    });

    if (!consent) {
      return { hasConsent: false };
    }

    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
      consent.status = ConsentStatus.EXPIRED;
      await this.consentRepository.save(consent);
      return { hasConsent: false };
    }

    return { hasConsent: true, consent };
  }

  async getPendingConsents(patientId: string): Promise<PatientConsent[]> {
    return this.consentRepository.find({
      where: {
        patientId,
        status: ConsentStatus.PENDING,
      },
      relations: ['template'],
      order: { createdAt: 'ASC' },
    });
  }

  async sendReminder(consentId: string, user: CurrentUserPayload): Promise<{ success: boolean; message: string }> {
    const consent = await this.consentRepository.findOne({
      where: { id: consentId },
      relations: ['patient', 'template'],
    });

    if (!consent) {
      throw new NotFoundException('Consent not found');
    }

    if (consent.status !== ConsentStatus.PENDING) {
      throw new BadRequestException('Can only send reminders for pending consents');
    }

    const patient = consent.patient;
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Send email reminder
    if (patient.email) {
      await this.emailService.send({
        to: patient.email,
        subject: `Action Required: Please Sign Your ${consent.template?.name || 'Consent Form'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Consent Form Reminder</h2>
            <p>Dear ${patient.firstName || 'Patient'},</p>
            <p>This is a friendly reminder that you have a pending consent form that requires your signature:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <strong>${consent.template?.name || 'Consent Form'}</strong>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                Sent on: ${new Date(consent.createdAt).toLocaleDateString()}
              </p>
            </div>
            <p>Please log in to your VytalWatch patient portal to review and sign this consent form.</p>
            <p>If you have any questions, please contact your healthcare provider.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated message from VytalWatch. Please do not reply directly to this email.
            </p>
          </div>
        `,
      });
    }

    // Update last reminder timestamp
    consent.lastReminderSentAt = new Date();
    consent.reminderCount = (consent.reminderCount || 0) + 1;
    await this.consentRepository.save(consent);

    await this.auditService.log({
      action: 'CONSENT_REMINDER_SENT',
      userId: user.sub,
      resourceType: 'patient_consent',
      resourceId: consentId,
      details: { patientId: consent.patientId, email: patient.email },
    });

    this.logger.log(`Consent reminder sent for ${consentId} to patient ${consent.patientId}`);

    return {
      success: true,
      message: `Reminder sent to ${patient.email || 'patient'}`,
    };
  }

  async seedDefaultTemplates(): Promise<ConsentTemplate[]> {
    try {
      const existingCount = await this.templateRepository.count();
      if (existingCount > 0) {
        this.logger.log('Consent templates already exist, skipping seed');
        return [];
      }
    } catch (error) {
      this.logger.warn('Could not check consent templates - table may not exist yet. Will retry on next startup.');
      return [];
    }

    const defaultTemplates = [
      {
        name: 'RPM Enrollment Consent',
        type: ConsentType.RPM_ENROLLMENT,
        version: '1.0',
        summary: 'Consent to participate in Remote Patient Monitoring program',
        content: `
<h2>Remote Patient Monitoring (RPM) Program Consent Form</h2>

<h3>Purpose of the Program</h3>
<p>The Remote Patient Monitoring (RPM) program allows your healthcare provider to monitor your health data remotely using FDA-approved medical devices. This program is designed to help manage your chronic conditions more effectively by enabling timely interventions based on real-time health data.</p>

<h3>What is Involved</h3>
<ul>
  <li><strong>Device Usage:</strong> You will be provided with medical devices (such as blood pressure monitors, pulse oximeters, weight scales, or glucose monitors) to measure your vital signs at home.</li>
  <li><strong>Data Transmission:</strong> Your health measurements will be automatically transmitted to your healthcare provider through a secure platform.</li>
  <li><strong>Monitoring:</strong> Your healthcare team will review your data regularly and may contact you if they notice any concerning trends or values.</li>
  <li><strong>Response Time:</strong> While we monitor your data regularly during business hours, this is NOT an emergency service. In case of emergency, please call 911.</li>
</ul>

<h3>Benefits</h3>
<ul>
  <li>Better management of chronic conditions</li>
  <li>Early detection of potential health issues</li>
  <li>Reduced need for in-person visits for routine monitoring</li>
  <li>More personalized care based on your actual health data</li>
</ul>

<h3>Risks and Limitations</h3>
<ul>
  <li>Device malfunction or connectivity issues may temporarily interrupt data transmission</li>
  <li>RPM does not replace emergency care services</li>
  <li>Delayed response possible during non-business hours</li>
</ul>

<h3>Your Rights</h3>
<p>Participation in the RPM program is voluntary. You may withdraw at any time by notifying your healthcare provider in writing. Withdrawal will not affect your standard medical care.</p>

<h3>Financial Responsibility</h3>
<p>RPM services may be billed to your insurance. You are responsible for any copays, deductibles, or non-covered charges as determined by your insurance plan.</p>

<p><strong>By signing below, I acknowledge that I have read and understand this consent form, have had the opportunity to ask questions, and agree to participate in the Remote Patient Monitoring program.</strong></p>
        `,
        expirationDays: null,
        requiresWitness: false,
        requiresGuardian: false,
      },
      {
        name: 'HIPAA Privacy Notice Acknowledgment',
        type: ConsentType.HIPAA,
        version: '1.0',
        summary: 'Acknowledgment of receipt of HIPAA privacy practices notice',
        content: `
<h2>Notice of Privacy Practices Acknowledgment</h2>

<h3>Your Information. Your Rights. Our Responsibilities.</h3>

<p>This notice describes how medical information about you may be used and disclosed and how you can get access to this information. Please review it carefully.</p>

<h3>Your Rights</h3>
<p>When it comes to your health information, you have certain rights. This section explains your rights and some of our responsibilities to help you.</p>

<ul>
  <li><strong>Get an electronic or paper copy</strong> of your medical record</li>
  <li><strong>Ask us to correct</strong> your medical record if you believe it is incorrect or incomplete</li>
  <li><strong>Request confidential communications</strong> - ask us to contact you in a specific way</li>
  <li><strong>Ask us to limit</strong> what we use or share</li>
  <li><strong>Get a list of those</strong> with whom we've shared your information</li>
  <li><strong>Get a copy of this privacy notice</strong></li>
  <li><strong>Choose someone to act for you</strong> - designate a personal representative</li>
  <li><strong>File a complaint</strong> if you feel your rights are violated</li>
</ul>

<h3>Our Uses and Disclosures</h3>
<p>We may use and share your health information for the following purposes:</p>
<ul>
  <li><strong>Treatment:</strong> Coordinating your medical care with other providers</li>
  <li><strong>Payment:</strong> Billing and receiving payment for services</li>
  <li><strong>Healthcare Operations:</strong> Improving care quality and training staff</li>
  <li><strong>As Required by Law:</strong> When federal, state, or local laws require disclosure</li>
</ul>

<h3>Our Responsibilities</h3>
<ul>
  <li>We are required by law to maintain the privacy and security of your protected health information</li>
  <li>We will let you know promptly if a breach occurs that may have compromised the privacy or security of your information</li>
  <li>We must follow the duties and privacy practices described in this notice</li>
</ul>

<p><strong>By signing below, I acknowledge that I have received a copy of the Notice of Privacy Practices and have been given the opportunity to review it.</strong></p>
        `,
        expirationDays: 365,
        requiresWitness: false,
        requiresGuardian: false,
      },
      {
        name: 'Telehealth Services Consent',
        type: ConsentType.TELEHEALTH,
        version: '1.0',
        summary: 'Consent for telehealth/telemedicine services',
        content: `
<h2>Telehealth Services Informed Consent</h2>

<h3>What is Telehealth?</h3>
<p>Telehealth involves the use of electronic communications to enable healthcare providers to deliver medical services remotely. This includes but is not limited to:</p>
<ul>
  <li>Live video consultations</li>
  <li>Secure messaging with your provider</li>
  <li>Remote monitoring of vital signs and health data</li>
  <li>Electronic transmission of medical records and prescriptions</li>
</ul>

<h3>Benefits of Telehealth</h3>
<ul>
  <li>Improved access to medical care without traveling to a clinic</li>
  <li>Reduced exposure to potentially contagious patients</li>
  <li>More efficient use of time for both patients and providers</li>
  <li>Better continuity of care for chronic condition management</li>
</ul>

<h3>Risks and Limitations</h3>
<ul>
  <li><strong>Technology Requirements:</strong> You need access to appropriate technology (smartphone, tablet, or computer with camera and microphone)</li>
  <li><strong>Technical Difficulties:</strong> Poor internet connection may affect the quality of the consultation</li>
  <li><strong>Privacy Risks:</strong> While we use secure, encrypted platforms, no technology is 100% secure</li>
  <li><strong>Limitations:</strong> Some conditions require in-person examination and cannot be adequately assessed via telehealth</li>
  <li><strong>Emergency Situations:</strong> Telehealth is not appropriate for medical emergencies. Call 911 for emergencies.</li>
</ul>

<h3>Your Responsibilities</h3>
<ul>
  <li>Ensure you are in a private, quiet location during telehealth visits</li>
  <li>Test your technology before appointments</li>
  <li>Provide accurate and complete medical information</li>
  <li>Inform us immediately if you experience any technical difficulties</li>
</ul>

<h3>Privacy and Security</h3>
<p>All telehealth sessions are conducted using HIPAA-compliant, encrypted platforms. Your healthcare information will be protected with the same privacy standards as in-person visits.</p>

<p><strong>By signing below, I consent to receive healthcare services via telehealth and acknowledge that I have read and understand the information provided above.</strong></p>
        `,
        expirationDays: null,
        requiresWitness: false,
        requiresGuardian: false,
      },
      {
        name: 'Data Sharing Agreement',
        type: ConsentType.DATA_SHARING,
        version: '1.0',
        summary: 'Consent to share health data with designated parties',
        content: `
<h2>Health Data Sharing Consent</h2>

<h3>Purpose</h3>
<p>This consent authorizes the sharing of your health information with designated third parties to enhance your care coordination and health outcomes.</p>

<h3>Information That May Be Shared</h3>
<ul>
  <li>Vital signs and biometric data (blood pressure, heart rate, weight, etc.)</li>
  <li>Medication information and adherence data</li>
  <li>Care plan details and progress notes</li>
  <li>Lab results and diagnostic information</li>
  <li>Appointment and care coordination information</li>
</ul>

<h3>Parties Who May Receive Your Information</h3>
<ul>
  <li>Your primary care provider and specialists involved in your care</li>
  <li>Care coordination teams and case managers</li>
  <li>Health insurance companies for claims processing</li>
  <li>Family members or caregivers you designate</li>
</ul>

<h3>Your Rights</h3>
<ul>
  <li>You may revoke this consent at any time by submitting a written request</li>
  <li>Revocation will not affect information already shared prior to revocation</li>
  <li>You may request a list of all parties who have received your information</li>
</ul>

<h3>Security Measures</h3>
<p>All data sharing occurs through secure, encrypted channels that comply with HIPAA regulations and industry best practices for healthcare data security.</p>

<p><strong>By signing below, I authorize the sharing of my health information as described above. I understand I may revoke this authorization at any time.</strong></p>
        `,
        expirationDays: 365,
        requiresWitness: false,
        requiresGuardian: false,
      },
      {
        name: 'Treatment Consent',
        type: ConsentType.TREATMENT,
        version: '1.0',
        summary: 'General consent for medical treatment',
        content: `
<h2>Consent for Medical Treatment</h2>

<h3>General Consent</h3>
<p>I hereby authorize the healthcare providers at this facility to perform medical examinations, diagnostic procedures, and treatments as deemed necessary for my care.</p>

<h3>Scope of Consent</h3>
<p>This consent covers:</p>
<ul>
  <li>Physical examinations</li>
  <li>Diagnostic testing (blood tests, imaging, etc.)</li>
  <li>Administration of medications</li>
  <li>Minor procedures typically performed in an outpatient setting</li>
  <li>Remote monitoring and telehealth services</li>
</ul>

<h3>Patient Acknowledgments</h3>
<p>I understand that:</p>
<ul>
  <li>Medicine is not an exact science and no guarantees can be made about my treatment outcomes</li>
  <li>I have the right to refuse any treatment</li>
  <li>I may ask questions about my diagnosis, treatment options, and prognosis at any time</li>
  <li>Specific procedures may require separate, detailed consent forms</li>
</ul>

<h3>Patient Responsibilities</h3>
<ul>
  <li>Provide accurate and complete health information</li>
  <li>Inform providers of all medications, supplements, and allergies</li>
  <li>Follow the treatment plan or notify providers if unable to do so</li>
  <li>Ask questions when instructions are unclear</li>
</ul>

<p><strong>By signing below, I consent to receive medical treatment and acknowledge that I have read and understand this consent form.</strong></p>
        `,
        expirationDays: null,
        requiresWitness: false,
        requiresGuardian: false,
      },
    ];

    const templates: ConsentTemplate[] = [];
    try {
      for (const templateData of defaultTemplates) {
        const template = this.templateRepository.create({
          ...templateData,
          isActive: true,
          organizationId: null, // Global templates available to all organizations
        });
        templates.push(await this.templateRepository.save(template));
      }

      this.logger.log(`Seeded ${templates.length} default consent templates`);
      return templates;
    } catch (error) {
      this.logger.warn('Could not seed consent templates - table may not be ready. Will retry on next startup.');
      return [];
    }
  }
}
