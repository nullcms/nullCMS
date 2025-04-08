import { SingletonSchema } from '@nullcms/shared';

export const settingsSchema: SingletonSchema = {
  title: 'Site Settings',
  description: 'Global site settings',
  timestamps: true,
  fields: {
    siteName: {
      type: 'string',
      required: true,
      label: 'Site Name',
    },
    siteDescription: {
      type: 'string',
      label: 'Site Description',
    },
    socialLinks: {
      type: 'array',
      of: {
        type: 'number',
        label: 'Social Links',
      },
      label: 'Social Media Links',
    },
  },
};