/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to Exotic Card Chaos</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🃏 EXOTIC CARD CHAOS</Text>
        <Heading style={h1}>You've been invited!</Heading>
        <Text style={text}>
          Someone wants you to join the chaos at{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>.
          Accept below to create your account.
        </Text>
        <Button style={button} href={confirmationUrl}>Accept Invitation</Button>
        <Text style={footer}>If you weren't expecting this invitation, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#121212', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { fontSize: '14px', fontWeight: '900' as const, color: '#FBBF24', letterSpacing: '0.15em', margin: '0 0 30px', textAlign: 'center' as const }
const h1 = { fontSize: '24px', fontWeight: '900' as const, color: '#F2F2F2', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#8C8C8C', lineHeight: '1.6', margin: '0 0 28px', textAlign: 'center' as const }
const link = { color: '#FBBF24', textDecoration: 'underline' }
const button = { backgroundColor: '#FBBF24', color: '#0D0D0D', fontSize: '14px', fontWeight: '700' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'block' as const, textAlign: 'center' as const, margin: '0 auto 28px' }
const footer = { fontSize: '12px', color: '#666666', margin: '30px 0 0', textAlign: 'center' as const }
