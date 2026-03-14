/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code for Exotic Card Chaos</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🃏 EXOTIC CARD CHAOS</Text>
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>This code will expire shortly. If you didn't request this, ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#121212', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { fontSize: '14px', fontWeight: '900' as const, color: '#FBBF24', letterSpacing: '0.15em', margin: '0 0 30px', textAlign: 'center' as const }
const h1 = { fontSize: '24px', fontWeight: '900' as const, color: '#F2F2F2', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#8C8C8C', lineHeight: '1.6', margin: '0 0 28px', textAlign: 'center' as const }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: '900' as const, color: '#FBBF24', margin: '0 0 30px', textAlign: 'center' as const, letterSpacing: '0.3em' }
const footer = { fontSize: '12px', color: '#666666', margin: '30px 0 0', textAlign: 'center' as const }
