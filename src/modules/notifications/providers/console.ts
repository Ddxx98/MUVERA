import { EmailProvider, SendEmailInput } from '../types';

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';

  async send(input: SendEmailInput): Promise<string> {
    const messageId = `msg_console_${Date.now()}`;
    console.log('\n======================= [TRANSACTIONAL EMAIL] =======================');
    console.log(`To: ${input.to}`);
    console.log(`Subject: ${input.subject}`);
    console.log('---------------------------------------------------------------------');
    console.log(input.text || input.html);
    console.log('=====================================================================\n');
    return messageId;
  }
}
