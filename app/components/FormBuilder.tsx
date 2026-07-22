import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Preview } from './Preview';
import styles from './FormBuilder.module.css';
import { Page, Section, FormField, HeaderConfig, FieldType } from './types';
import { useReactToPrint } from 'react-to-print';
import { Printer, Undo, Redo } from 'lucide-react';
import { PublishButton } from './PublishButton';
import { SaveButton } from './SaveButton';
import { arrayMove } from '@dnd-kit/sortable';
import { useHistory } from '../hooks/useHistory';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type ApplicantType = 'Vendor' | 'Financier';
type EntityType = 'Proprietorship' | 'Partnership' | 'LLP' | 'Private Limited' | 'Public Limited';

interface TemplateConfig {
    pages: Page[];
    headerConfig: HeaderConfig;
}

const DEFAULT_PAGES: Page[] = [
    {
        id: 'page1',
        sections: [
            {
                id: 'basic-details',
                title: 'Basic Entity Details',
                fields: [
                    { id: 'en', label: 'Entity Name', value: '', type: 'text', boxCount: 30 },
                    { id: 'ra', label: 'Registered Address', value: '', type: 'text', helpText: '(As provided in GST)' },
                    { id: 'rpc', label: 'Pin Code', value: '', type: 'text', boxCount: 6 },
                    { id: 'rcy', label: 'City', value: '', type: 'text', boxCount: 15 },
                    { id: 'rst', label: 'State', value: '', type: 'text', boxCount: 15 },
                    { id: 'msa', label: 'Mailing Address', value: '', type: 'checkbox', options: ['Same as registered address'] },
                    { id: 'ma', label: 'Mailing Address', value: '', type: 'text', helpText: 'If not same' },
                    { id: 'mpc', label: 'Pin Code', value: '', type: 'text', boxCount: 6 },
                    { id: 'mcy', label: 'City', value: '', type: 'text', boxCount: 15 },
                    { id: 'mst', label: 'State', value: '', type: 'text', boxCount: 15 },
                    { id: 'cei', label: 'Company Email ID', value: '', type: 'text', boxCount: 25 },
                    { id: 'cpn', label: 'Company Phone No.', value: '', type: 'text', boxCount: 10 },
                    { id: 'et', label: 'Entity Type', value: '', type: 'checkbox', options: ['Proprietorship', 'Partnership', 'LLP', 'PVT Limited', 'Public Limited', 'Statutory Body', 'Other'] },
                    { id: 'ets', label: 'Please Specify', value: '', type: 'text', helpText: 'If Other', boxCount: 20 },
                    { id: 'nob', label: 'Nature of Business', value: '', type: 'checkbox', options: ['Industrial Activity', 'Business / Professional'] },
                    { id: 'doi', label: 'Date of Incorporation', value: '', type: 'date' },
                    { id: 'it', label: 'Industry Type', value: '', type: 'text', boxCount: 20 },
                    { id: 'to', label: 'Turnover', value: '', type: 'number' },
                    { id: 'at', label: 'Activity Type', value: '', type: 'text', boxCount: 20 },
                    { id: 'ac', label: 'Activity Code', value: '', type: 'text', boxCount: 10 },
                    { id: 'pan', label: 'PAN Number', value: '', type: 'text', boxCount: 10 },
                    { id: 'cin', label: 'CIN / LLPIN', value: '', type: 'text', boxCount: 21 },
                    { id: 'ivp', label: 'Investment in Plant or Property', value: '', type: 'number' },
                    { id: 'gst', label: 'GSTIN', value: '', type: 'text', boxCount: 15 },
                    { id: 'udy', label: 'Udyam Registration No.', value: '', type: 'text', boxCount: 19, helpText: '(If applicable)' },
                    { id: 'ckyc', label: 'KIN / CKYC Number', value: '', type: 'text', boxCount: 14, helpText: '(If applicable)' },
                    { id: 'sez', label: 'Is part of SEZ / DTA / STP', value: '', type: 'checkbox', options: ['Yes', 'No'] },
                ]
            },
            {
                id: 'ckyc-consent',
                title: 'CKYC Consent (Entity)',
                fields: [
                    { id: 'cc-desc', label: 'Consent Detail', value: '', type: 'text', helpText: 'hereby gives consent to KredX Platform Private Limited to download the CKYC Records from the Central CKYC Registry (CKYCR) and having CKYC provides this consent on the understanding that the data will only be used for verification purposes as outlined above.' },
                    { id: 'cc-name', label: 'CKYC Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'cc-num', label: 'CKYC Number', value: '', type: 'text', boxCount: 14 },
                    { id: 'cc-date', label: 'Date', value: '', type: 'date' },
                    { id: 'cc-sign', label: 'Authorised Signatory as per Board Resolution', value: '', type: 'signature' },
                ]
            },
            {
                id: 'proprietors',
                title: 'Proprietors Monthly Income',
                fields: [
                    { id: 'mi', label: 'Monthly Income', value: '', type: 'checkbox', options: ['Less than Rs. 50,000', 'Rs. 50,000 to Rs. 75,000', 'Rs. 75,000 to Rs. 1,00,000', 'More than Rs. 1,00,000'], helpText: 'Partner 1 / Partner 2 / Partner 3 / Partner 4' }
                ]
            },
            {
                id: 'bank-acc-1',
                title: 'Bank Account Information (Account 1)',
                fields: [
                    { id: 'b1-an', label: 'Account Number', value: '', type: 'text', boxCount: 16 },
                    { id: 'b1-bn', label: 'Bank Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'b1-hn', label: 'Account Holder Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'b1-be', label: 'Bank Branch Email ID', value: '', type: 'text', boxCount: 25 },
                    { id: 'b1-cn', label: 'Contact Person Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'b1-cp', label: 'Contact Person Phone', value: '', type: 'text', boxCount: 10 },
                    { id: 'b1-cd', label: 'Contact Person Designation', value: '', type: 'text', boxCount: 15 },
                    { id: 'b1-ifsc', label: 'IFSC', value: '', type: 'text', boxCount: 11 },
                    { id: 'b1-od', label: 'OD / CC Amount', value: '', type: 'number', helpText: '(if applicable)' },
                    { id: 'b1-tl', label: 'Term Loan', value: '', type: 'number', helpText: '(if applicable)' },
                    { id: 'b1-at', label: 'Account Type', value: '', type: 'checkbox', options: ['Working Capital A/C', 'Payment Account', 'Use for auto debit'] },
                ]
            },
            {
                id: 'declaration',
                title: 'Declaration',
                fields: [
                    { id: 'dec-text', label: 'Declaration', value: '', type: 'text', helpText: 'We hereby declare that the details furnished above are true and correct to the best of our knowledge and belief and we undertake to inform you of any changes therein immediately. In case any of the above information is found to be false or untrue or misleading or misrepresenting, we are aware that we may be held liable for it.' },
                    { id: 'dec-date', label: 'Date', value: '', type: 'date' },
                    { id: 'dec-sign', label: 'Authorised Signatory as per Board Resolution', value: '', type: 'signature', showSignature: true },
                ]
            }
        ]
    }
];

const DEFAULT_HEADER_CONFIG: HeaderConfig = {
    logoText: 'DTX',
    logoHighlight: 'X',
    subHeader: ['DOMESTIC', 'TRADE', 'EXCHANGE'],
    companyName: 'KredX Platform Private Limited',
    formTitle: 'Application Form',
    disclaimer: 'All fields are mandatory. If a field is not applicable, please write "NA" — do not leave any fields blank.'
};

const TEMPLATE_MAP: Record<string, { applicantType: ApplicantType; entityType: EntityType }> = {
    'vendor-proprietorship': { applicantType: 'Vendor', entityType: 'Proprietorship' },
    'vendor-partnership': { applicantType: 'Vendor', entityType: 'Partnership' },
    'vendor-llp': { applicantType: 'Vendor', entityType: 'LLP' },
    'vendor-private-limited': { applicantType: 'Vendor', entityType: 'Private Limited' },
    'vendor-public-limited': { applicantType: 'Vendor', entityType: 'Public Limited' },
    'financier-proprietorship': { applicantType: 'Financier', entityType: 'Proprietorship' },
    'financier-partnership': { applicantType: 'Financier', entityType: 'Partnership' },
    'financier-llp': { applicantType: 'Financier', entityType: 'LLP' },
    'financier-private-limited': { applicantType: 'Financier', entityType: 'Private Limited' },
    'financier-public-limited': { applicantType: 'Financier', entityType: 'Public Limited' },
    'loan-application': { applicantType: 'Vendor', entityType: 'Private Limited' },
};

const getSignatoryLabel = (entityType: EntityType) => {
    if (entityType === 'Proprietorship') return 'Proprietor Signature';
    if (entityType === 'Partnership') return 'Partner Signature';
    return 'Authorised Signatory as per Board Resolution';
};

const buildApplicationTemplate = (applicantType: ApplicantType, entityType: EntityType): TemplateConfig => {
    const incorporationLabel = entityType === 'Proprietorship' || entityType === 'Partnership' ? 'Date of Establishment' : 'Date of Incorporation';
    const signatoryLabel = getSignatoryLabel(entityType);

    const basicDetails: Section = {
        id: 'basic-details',
        title: 'Basic Entity Details',
        fields: [
            { id: 'app-type', label: 'Applicant Type', value: applicantType, type: 'checkbox', options: ['Vendor', 'Financier'] },
            { id: 'et', label: 'Entity Type', value: entityType, type: 'checkbox', options: ['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited'] },
            { id: 'en', label: 'Entity Name', value: '', type: 'text', boxCount: 30 },
            { id: 'ra', label: 'Registered Address', value: '', type: 'text' },
            { id: 'rpc', label: 'Pin Code', value: '', type: 'text', boxCount: 6 },
            { id: 'rcy', label: 'City', value: '', type: 'text', boxCount: 15 },
            { id: 'rst', label: 'State', value: '', type: 'text', boxCount: 15 },
            { id: 'msa', label: 'Mailing Address', value: '', type: 'checkbox', options: ['Same as registered address'] },
            { id: 'ma', label: 'Mailing Address', value: '', type: 'text', helpText: 'If not same' },
            { id: 'mpc', label: 'Pin Code', value: '', type: 'text', boxCount: 6 },
            { id: 'mcy', label: 'City', value: '', type: 'text', boxCount: 15 },
            { id: 'mst', label: 'State', value: '', type: 'text', boxCount: 15 },
            { id: 'cei', label: 'Company Email ID', value: '', type: 'text', boxCount: 25 },
            { id: 'cpn', label: 'Company Phone No.', value: '', type: 'text', boxCount: 10 },
            { id: 'nob', label: 'Nature of Business', value: '', type: 'checkbox', options: ['Manufacturing', 'Trading', 'Services', 'Other'] },
            { id: 'doi', label: incorporationLabel, value: '', type: 'date' },
            { id: 'it', label: 'Industry Type', value: '', type: 'text', boxCount: 20 },
            { id: 'to', label: 'Annual Turnover (INR)', value: '', type: 'number' },
            { id: 'pan', label: 'PAN Number', value: '', type: 'text', boxCount: 10 },
            { id: 'gst', label: 'GSTIN', value: '', type: 'text', boxCount: 15 },
            { id: 'udy', label: 'Udyam Registration No.', value: '', type: 'text', boxCount: 19, helpText: '(If applicable)' },
            { id: 'ckyc', label: 'KIN / CKYC Number', value: '', type: 'text', boxCount: 14, helpText: '(If applicable)' },
        ]
    };

    const constitutionDetails: Section = (() => {
        if (entityType === 'Proprietorship') {
            return {
                id: 'proprietor-details',
                title: 'Proprietor Details',
                fields: [
                    { id: 'prop-name', label: 'Proprietor Full Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'prop-pan', label: 'Proprietor PAN', value: '', type: 'text', boxCount: 10 },
                    { id: 'prop-aadhaar', label: 'Proprietor Aadhaar', value: '', type: 'text', boxCount: 12 },
                    { id: 'prop-dob', label: 'Proprietor Date of Birth', value: '', type: 'date' },
                    { id: 'prop-mobile', label: 'Proprietor Mobile No.', value: '', type: 'text', boxCount: 10 },
                    { id: 'prop-email', label: 'Proprietor Email ID', value: '', type: 'text', boxCount: 25 },
                    { id: 'prop-address', label: 'Proprietor Residential Address', value: '', type: 'text' },
                ]
            };
        }

        if (entityType === 'Partnership') {
            return {
                id: 'partner-details',
                title: 'Partner Details',
                fields: [
                    { id: 'firm-reg', label: 'Firm Registration Number', value: '', type: 'text', boxCount: 20, helpText: '(If applicable)' },
                    { id: 'p1-name', label: 'Partner 1 Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'p1-pan', label: 'Partner 1 PAN', value: '', type: 'text', boxCount: 10 },
                    { id: 'p1-aadhaar', label: 'Partner 1 Aadhaar', value: '', type: 'text', boxCount: 12 },
                    { id: 'p1-mobile', label: 'Partner 1 Mobile No.', value: '', type: 'text', boxCount: 10 },
                    { id: 'p1-email', label: 'Partner 1 Email ID', value: '', type: 'text', boxCount: 25 },
                    { id: 'p2-name', label: 'Partner 2 Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'p2-pan', label: 'Partner 2 PAN', value: '', type: 'text', boxCount: 10 },
                    { id: 'p2-aadhaar', label: 'Partner 2 Aadhaar', value: '', type: 'text', boxCount: 12 },
                    { id: 'p2-mobile', label: 'Partner 2 Mobile No.', value: '', type: 'text', boxCount: 10 },
                    { id: 'p2-email', label: 'Partner 2 Email ID', value: '', type: 'text', boxCount: 25 },
                ]
            };
        }

        if (entityType === 'LLP') {
            return {
                id: 'llp-details',
                title: 'LLP & Designated Partner Details',
                fields: [
                    { id: 'llpin', label: 'LLPIN', value: '', type: 'text', boxCount: 21 },
                    { id: 'dp1-name', label: 'Designated Partner 1 Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'dp1-dpin', label: 'Designated Partner 1 DPIN', value: '', type: 'text', boxCount: 12 },
                    { id: 'dp1-pan', label: 'Designated Partner 1 PAN', value: '', type: 'text', boxCount: 10 },
                    { id: 'dp1-mobile', label: 'Designated Partner 1 Mobile No.', value: '', type: 'text', boxCount: 10 },
                    { id: 'dp1-email', label: 'Designated Partner 1 Email ID', value: '', type: 'text', boxCount: 25 },
                    { id: 'dp2-name', label: 'Designated Partner 2 Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'dp2-dpin', label: 'Designated Partner 2 DPIN', value: '', type: 'text', boxCount: 12 },
                    { id: 'dp2-pan', label: 'Designated Partner 2 PAN', value: '', type: 'text', boxCount: 10 },
                    { id: 'dp2-mobile', label: 'Designated Partner 2 Mobile No.', value: '', type: 'text', boxCount: 10 },
                    { id: 'dp2-email', label: 'Designated Partner 2 Email ID', value: '', type: 'text', boxCount: 25 },
                ]
            };
        }

        if (entityType === 'Private Limited') {
            return {
                id: 'company-details',
                title: 'Company & Director Details',
                fields: [
                    { id: 'cin', label: 'CIN', value: '', type: 'text', boxCount: 21 },
                    { id: 'd1-name', label: 'Director 1 Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'd1-din', label: 'Director 1 DIN', value: '', type: 'text', boxCount: 8 },
                    { id: 'd1-pan', label: 'Director 1 PAN', value: '', type: 'text', boxCount: 10 },
                    { id: 'd1-mobile', label: 'Director 1 Mobile No.', value: '', type: 'text', boxCount: 10 },
                    { id: 'd1-email', label: 'Director 1 Email ID', value: '', type: 'text', boxCount: 25 },
                    { id: 'd2-name', label: 'Director 2 Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'd2-din', label: 'Director 2 DIN', value: '', type: 'text', boxCount: 8 },
                    { id: 'd2-pan', label: 'Director 2 PAN', value: '', type: 'text', boxCount: 10 },
                    { id: 'd2-mobile', label: 'Director 2 Mobile No.', value: '', type: 'text', boxCount: 10 },
                    { id: 'd2-email', label: 'Director 2 Email ID', value: '', type: 'text', boxCount: 25 },
                    { id: 'as-name', label: 'Authorised Signatory Name', value: '', type: 'text', boxCount: 25 },
                    { id: 'as-desg', label: 'Authorised Signatory Designation', value: '', type: 'text', boxCount: 15 },
                ]
            };
        }

        return {
            id: 'public-company-details',
            title: 'Company & Key Personnel Details',
            fields: [
                { id: 'cin', label: 'CIN', value: '', type: 'text', boxCount: 21 },
                { id: 'd1-name', label: 'Director 1 Name', value: '', type: 'text', boxCount: 25 },
                { id: 'd1-din', label: 'Director 1 DIN', value: '', type: 'text', boxCount: 8 },
                { id: 'd1-pan', label: 'Director 1 PAN', value: '', type: 'text', boxCount: 10 },
                { id: 'd1-mobile', label: 'Director 1 Mobile No.', value: '', type: 'text', boxCount: 10 },
                { id: 'd1-email', label: 'Director 1 Email ID', value: '', type: 'text', boxCount: 25 },
                { id: 'cs-name', label: 'Company Secretary Name', value: '', type: 'text', boxCount: 25 },
                { id: 'cs-mem', label: 'Company Secretary Membership No.', value: '', type: 'text', boxCount: 15 },
                { id: 'as-name', label: 'Authorised Signatory Name', value: '', type: 'text', boxCount: 25 },
                { id: 'as-desg', label: 'Authorised Signatory Designation', value: '', type: 'text', boxCount: 15 },
            ]
        };
    })();

    const applicantDetails: Section = applicantType === 'Vendor'
        ? {
            id: 'vendor-business',
            title: 'Vendor Business Details',
            fields: [
                { id: 'v-gs', label: 'Primary Goods / Services', value: '', type: 'text', boxCount: 30 },
                { id: 'v-yib', label: 'Years in Business', value: '', type: 'number' },
                { id: 'v-b1-name', label: 'Top Buyer 1 Name', value: '', type: 'text', boxCount: 25 },
                { id: 'v-b1-gst', label: 'Top Buyer 1 GSTIN', value: '', type: 'text', boxCount: 15 },
                { id: 'v-b2-name', label: 'Top Buyer 2 Name', value: '', type: 'text', boxCount: 25 },
                { id: 'v-b2-gst', label: 'Top Buyer 2 GSTIN', value: '', type: 'text', boxCount: 15 },
                { id: 'v-acp', label: 'Average Credit Period (days)', value: '', type: 'number' },
                { id: 'v-ams', label: 'Average Monthly Sales (INR)', value: '', type: 'number' },
                { id: 'v-aiv', label: 'Average Invoice Value (INR)', value: '', type: 'number' },
                { id: 'v-efa', label: 'Existing Financing Arrangement', value: '', type: 'checkbox', options: ['Yes', 'No'] },
            ]
        }
        : {
            id: 'financier-business',
            title: 'Financier Business Details',
            fields: [
                { id: 'f-type', label: 'Institution Type', value: '', type: 'checkbox', options: ['Bank', 'NBFC', 'AIF', 'Corporate', 'Other'] },
                { id: 'f-rbi', label: 'RBI Registration No.', value: '', type: 'text', boxCount: 20, helpText: '(If applicable)' },
                { id: 'f-sebi', label: 'SEBI Registration No.', value: '', type: 'text', boxCount: 20, helpText: '(If applicable)' },
                { id: 'f-aum', label: 'Assets Under Management (INR)', value: '', type: 'number' },
                { id: 'f-ats', label: 'Average Ticket Size (INR)', value: '', type: 'number' },
                { id: 'f-sf', label: 'Sector Focus', value: '', type: 'text', boxCount: 30 },
                { id: 'f-cp', label: 'Primary Contact Person Name', value: '', type: 'text', boxCount: 25 },
                { id: 'f-cd', label: 'Primary Contact Person Designation', value: '', type: 'text', boxCount: 15 },
                { id: 'f-ce', label: 'Primary Contact Person Email ID', value: '', type: 'text', boxCount: 25 },
                { id: 'f-cm', label: 'Primary Contact Person Mobile No.', value: '', type: 'text', boxCount: 10 },
            ]
        };

    const bankAccount: Section = {
        id: 'bank-acc-1',
        title: 'Bank Account Information (Primary Account)',
        fields: [
            { id: 'b1-an', label: 'Account Number', value: '', type: 'text', boxCount: 16 },
            { id: 'b1-bn', label: 'Bank Name', value: '', type: 'text', boxCount: 25 },
            { id: 'b1-hn', label: 'Account Holder Name', value: '', type: 'text', boxCount: 25 },
            { id: 'b1-ifsc', label: 'IFSC', value: '', type: 'text', boxCount: 11 },
            { id: 'b1-cn', label: 'Contact Person Name', value: '', type: 'text', boxCount: 25 },
            { id: 'b1-cp', label: 'Contact Person Phone', value: '', type: 'text', boxCount: 10 },
            { id: 'b1-cd', label: 'Contact Person Designation', value: '', type: 'text', boxCount: 15 },
        ]
    };

    const ckycConsent: Section = {
        id: 'ckyc-consent',
        title: 'CKYC Consent (Entity)',
        fields: [
            { id: 'cc-desc', label: 'Consent Detail', value: '', type: 'text', helpText: 'hereby gives consent to KredX Platform Private Limited to download the CKYC Records from the Central CKYC Registry (CKYCR) and having CKYC provides this consent on the understanding that the data will only be used for verification purposes as outlined above.' },
            { id: 'cc-name', label: 'CKYC Name', value: '', type: 'text', boxCount: 25 },
            { id: 'cc-num', label: 'CKYC Number', value: '', type: 'text', boxCount: 14 },
            { id: 'cc-date', label: 'Date', value: '', type: 'date' },
            { id: 'cc-sign', label: signatoryLabel, value: '', type: 'signature', showSignature: true },
        ]
    };

    const declaration: Section = {
        id: 'declaration',
        title: 'Declaration',
        fields: [
            { id: 'dec-text', label: 'Declaration', value: '', type: 'text', helpText: 'We hereby declare that the details furnished above are true and correct to the best of our knowledge and belief and we undertake to inform you of any changes therein immediately. In case any of the above information is found to be false or untrue or misleading or misrepresenting, we are aware that we may be held liable for it.' },
            { id: 'dec-date', label: 'Date', value: '', type: 'date' },
            { id: 'dec-sign', label: signatoryLabel, value: '', type: 'signature', showSignature: true },
        ]
    };

    const pages: Page[] = [
        {
            id: 'page1',
            sections: [basicDetails, constitutionDetails, applicantDetails, bankAccount, ckycConsent, declaration]
        }
    ];

    const headerConfig: HeaderConfig = {
        ...DEFAULT_HEADER_CONFIG,
        formTitle: `${applicantType} Application Form (${entityType})`,
        formName: `${applicantType} - ${entityType} Application Form`,
    };

    return { pages, headerConfig };
};

const getTemplateConfig = (templateId: string | null): TemplateConfig | null => {
    if (!templateId) return null;
    const def = TEMPLATE_MAP[templateId];
    if (!def) return null;
    return buildApplicationTemplate(def.applicantType, def.entityType);
};

export function FormBuilder() {
    const searchParams = useSearchParams();
    const templateId = searchParams?.get('template') || null;
    const templateConfig = getTemplateConfig(templateId);
    const [formId, setFormId] = useState<string | null>(searchParams?.get('id') || null);
    const [isLoadingForm, setIsLoadingForm] = useState(!!formId);
    const [templateApplied, setTemplateApplied] = useState(!!templateConfig);

    const {
        pages,
        headerConfig,
        pushState,
        undo,
        redo,
        canUndo,
        canRedo
    } = useHistory(
        templateConfig?.pages || DEFAULT_PAGES,
        templateConfig?.headerConfig || DEFAULT_HEADER_CONFIG
    );

    useEffect(() => {
        if (formId) return;
        if (templateApplied) return;
        if (!templateConfig) return;
        pushState(templateConfig.pages, templateConfig.headerConfig);
        setTemplateApplied(true);
    }, [formId, templateApplied, templateConfig, pushState]);

    const setPages = (value: Page[] | ((prev: Page[]) => Page[])) => {
        const newPages = typeof value === 'function' ? value(pages) : value;
        pushState(newPages, headerConfig);
    };

    const setHeaderConfig = (value: HeaderConfig | ((prev: HeaderConfig) => HeaderConfig)) => {
        const newHeader = typeof value === 'function' ? value(headerConfig) : value;
        pushState(pages, newHeader);
    };

    // Load form from database if formId is in URL
    useEffect(() => {
        const loadForm = async () => {
            if (!formId) {
                setIsLoadingForm(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('forms')
                    .select('*')
                    .eq('id', formId)
                    .single();

                if (error) throw error;

                if (data && data.structure) {
                    // Load the saved structure
                    pushState(
                        data.structure.pages || pages,
                        data.structure.headerConfig || headerConfig
                    );
                    if (data.background_color) {
                        setBackgroundColor(data.background_color);
                    }
                }
            } catch (error) {
                console.error('Error loading form:', error);
                alert('Failed to load form. Starting with a blank form instead.');
            } finally {
                setIsLoadingForm(false);
            }
        };

        loadForm();
    }, [formId]);

    const handleFormSaved = (savedFormId: string) => {
        setFormId(savedFormId);
    };


    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: 'Fintech_Form_Application',
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const updateHeader = (updates: Partial<HeaderConfig>) => {
        setHeaderConfig(prev => ({ ...prev, ...updates }));
    };

    const updateSection = (pageId: string, sectionId: string, updates: Partial<Section>) => {
        setPages(prev => prev.map(page => {
            if (page.id !== pageId) return page;
            return {
                ...page,
                sections: page.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s)
            };
        }));
    };

    const updateField = (pageId: string, sectionId: string, fieldId: string, updates: Partial<FormField>) => {
        setPages(prev => prev.map(page => {
            if (page.id !== pageId) return page;
            return {
                ...page,
                sections: page.sections.map(s => {
                    if (s.id !== sectionId) return s;
                    return {
                        ...s,
                        fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
                    };
                })
            };
        }));
    };

    const addField = (pageId: string, sectionId: string, type: FieldType = 'text') => {
        const newField: FormField = {
            id: Math.random().toString(36).substr(2, 9),
            label: type === 'signature' ? 'Signature / Photo' : 'New Field',
            value: '',
            type: type,
            boxCount: type === 'text' || type === 'number' ? 10 : undefined,
            checked: type === 'checkbox' ? false : undefined,
            showPhoto: type === 'signature' ? false : undefined,
            showSignature: type === 'signature' ? true : undefined
        };
        setPages(prev => prev.map(page => {
            if (page.id !== pageId) return page;
            return {
                ...page,
                sections: page.sections.map(s => {
                    if (s.id !== sectionId) return s;
                    return { ...s, fields: [...s.fields, newField] };
                })
            };
        }));
    };

    const removeField = (pageId: string, sectionId: string, fieldId: string) => {
        setPages(prev => prev.map(page => {
            if (page.id !== pageId) return page;
            return {
                ...page,
                sections: page.sections.map(s => {
                    if (s.id !== sectionId) return s;
                    return { ...s, fields: s.fields.filter(f => f.id !== fieldId) };
                })
            };
        }));
    };

    const addPage = () => {
        const newPage: Page = {
            id: Math.random().toString(36).substr(2, 9),
            sections: [
                {
                    id: Math.random().toString(36).substr(2, 9),
                    title: 'New Section',
                    fields: [
                        { id: Math.random().toString(36).substr(2, 9), label: 'Field 1', value: '', type: 'text' }
                    ]
                }
            ]
        };
        setPages(prev => [...prev, newPage]);
    };

    const addSection = (pageId: string) => {
        const newSection: Section = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'New Section',
            fields: []
        };
        setPages(prev => prev.map(page => {
            if (page.id !== pageId) return page;
            return { ...page, sections: [...page.sections, newSection] };
        }));
    };

    const removeSection = (pageId: string, sectionId: string) => {
        setPages(prev => prev.map(page => {
            if (page.id !== pageId) return page;
            return { ...page, sections: page.sections.filter(s => s.id !== sectionId) };
        }));
    };

    const removePage = (pageId: string) => {
        setPages(prev => prev.filter(p => p.id !== pageId));
    };

    const reorderFields = (pageId: string, sectionId: string, oldIndex: number, newIndex: number) => {
        setPages(prev => prev.map(page => {
            if (page.id !== pageId) return page;
            return {
                ...page,
                sections: page.sections.map(s => {
                    if (s.id !== sectionId) return s;
                    return { ...s, fields: arrayMove(s.fields, oldIndex, newIndex) };
                })
            };
        }));
    };

    const reorderSections = (pageId: string, oldIndex: number, newIndex: number) => {
        setPages(prev => prev.map(page => {
            if (page.id !== pageId) return page;
            return {
                ...page,
                sections: arrayMove(page.sections, oldIndex, newIndex)
            };
        }));
    };

    const [backgroundColor, setBackgroundColor] = useState('#ffffff');

    // Show loading state while form is being loaded
    if (isLoadingForm) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff'
            }}>
                <div style={{
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #f6f6f6',
                        borderTopColor: '#1a1a1a',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ color: '#606060', fontSize: '0.875rem' }}>Loading form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <Sidebar
                    pages={pages}
                    headerConfig={headerConfig}
                    onUpdateSection={updateSection}
                    onUpdateField={updateField}
                    onAddField={addField}
                    onRemoveField={removeField}
                    onAddPage={addPage}
                    onAddSection={addSection}
                    onRemoveSection={removeSection}
                    onRemovePage={removePage}
                    onReorderFields={reorderFields}
                    onReorderSections={reorderSections}
                    onUpdateHeader={updateHeader}
                />

                <div style={{ paddingBottom: '2rem' }}></div>
            </aside>
            <main className={styles.main}>
                {/* Header with Background */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.headerLeft}>
                            <h1 className={styles.headerTitle}>Form Editor</h1>
                            <p className={styles.headerSubtitle}>
                                {headerConfig.formName || 'Untitled Form'}
                            </p>
                        </div>

                        <div className={styles.headerRight}>
                            <div className={styles.undoRedoGroup}>
                                <button
                                    onClick={undo}
                                    disabled={!canUndo}
                                    className={styles.iconButton}
                                    title="Undo"
                                >
                                    <Undo size={18} />
                                </button>
                                <button
                                    onClick={redo}
                                    disabled={!canRedo}
                                    className={styles.iconButton}
                                    title="Redo"
                                >
                                    <Redo size={18} />
                                </button>
                            </div>

                            <div className={styles.colorPickerGroup}>
                                <label className={styles.colorLabel}>Background</label>
                                <input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={(e) => setBackgroundColor(e.target.value)}
                                    className={styles.colorPicker}
                                />
                            </div>

                            <button
                                onClick={() => handlePrint && handlePrint()}
                                className={styles.secondaryButton}
                            >
                                <Printer size={18} />
                                Export PDF
                            </button>

                            <SaveButton
                                pages={pages}
                                headerConfig={headerConfig}
                                backgroundColor={backgroundColor}
                                formId={formId || undefined}
                                onSaved={handleFormSaved}
                            />

                            <PublishButton
                                pages={pages}
                                headerConfig={headerConfig}
                                backgroundColor={backgroundColor}
                            />
                        </div>
                    </div>
                </div>

                {/* Preview Area */}
                <div className={styles.previewArea}>
                    <Preview
                        pages={pages}
                        headerConfig={headerConfig}
                        onUpdateField={updateField}
                        onUpdateHeader={updateHeader}
                        ref={componentRef}
                        backgroundColor={backgroundColor}
                    />
                </div>
            </main>
        </div>
    );
}
