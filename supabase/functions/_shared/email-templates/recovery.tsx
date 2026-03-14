/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for Exotic Card Chaos</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🃏 EXOTIC CARD CHAOS</Text>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Hit the button below to choose a new one.
        </Text>
        <Button style={button} href={confirmationUrl}>Reset Password</Button>
        <Text style={footer}>If you didn't request a password reset, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#121212', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { fontSize: '14px', fontWeight: '900' as const, color: '#FBBF24', letterSpacing: '0.15em', margin: '0 0 30px', textAlign: 'center' as const }
const h1 = { fontSize: '24px', fontWeight: '900' as const, color: '#F2F2F2', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#8C8C8C', lineHeight: '1.6', margin: '0 0 28px', textAlign: 'center' as const }
const button = { backgroundColor: '#FBBF24', color: '#0D0D0D', fontSize: '14px', fontWeight: '700' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'block' as const, textAlign: 'center' as const, margin: '0 auto 28px' }
const footer = { fontSize: '12px', color: '#666666', margin: '30px 0 0', textAlign: 'center' as const }
