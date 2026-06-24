import React from 'react';

/**
 * Creator/Person Schema - Used on creator profile pages
 * Increases visibility in Creator knowledge panels
 *
 * @see https://schema.org/Person
 */

interface CreatorSchemaProps {
  /** Creator name (required) */
  name: string;
  /** Email address (optional but recommended) */
  email?: string;
  /** Profile picture URL (optional) */
  avatar?: string;
  /** Bio/description (optional) */
  description?: string;
  /** Number of followers/subscribers (optional) */
  subscribers?: number;
  /** Creator profile URL (required) */
  profileUrl: string;
  /** Social media profiles (optional) */
  sameAs?: string[];
  /** Verified status (optional) */
  verified?: boolean;
  /** Video count (optional) */
  videoCount?: number;
}

export const CreatorSchema: React.FC<CreatorSchemaProps> = ({
  name,
  email,
  avatar,
  description,
  subscribers,
  profileUrl,
  sameAs,
  verified,
  videoCount,
}) => {
  // Validate required fields
  if (!name || !profileUrl) {
    console.warn('[CreatorSchema] Missing required fields: name, profileUrl');
    return null;
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: name,
    url: profileUrl,
    ...(email && { email: email }),
    ...(avatar && { image: avatar }),
    ...(description && { description: description }),
    // Social media profiles
    ...(sameAs?.length && { sameAs: sameAs }),
    // Interaction stats
    ...(subscribers && {
      interactionCount: `${subscribers} followers`,
    }),
    // For Creator economy
    ...(videoCount && {
      knowsAbout: [
        {
          '@type': 'Thing',
          name: 'Video Creation',
        },
      ],
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};
