<?php
declare(strict_types=1);

function smtpConfigValue(string $key, ?string $default = null): ?string {
    if (function_exists('env')) {
        $value = env($key, $default);
        return $value === null ? $default : (string)$value;
    }

    $value = getenv($key);
    return $value === false ? $default : (string)$value;
}

function smtpReadResponse($socket): array {
    $response = '';
    $code = 0;

    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (preg_match('/^(\d{3})(\s|-)/', $line, $matches)) {
            $code = (int)$matches[1];
            if ($matches[2] === ' ') {
                break;
            }
        }
    }

    return [$code, trim($response)];
}

function smtpSendCommand($socket, string $command, array $expectedCodes, array &$debug): bool {
    if ($command !== '') {
        fwrite($socket, $command . "\r\n");
    }

    [$code, $response] = smtpReadResponse($socket);
    $debug[] = ['command' => $command === '' ? 'CONNECT' : strtok($command, ' '), 'code' => $code, 'response' => $response];

    return in_array($code, $expectedCodes, true);
}

function smtpNormalizeMessage(string $message): string {
    $message = str_replace(["\r\n", "\r"], "\n", $message);
    $message = preg_replace('/^\./m', '..', $message);
    return str_replace("\n", "\r\n", $message);
}

function smtpEncodeHeader(string $value): string {
    return function_exists('mb_encode_mimeheader')
        ? mb_encode_mimeheader($value, 'UTF-8')
        : '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function smtpAddress(string $email, string $name = ''): string {
    $email = filter_var($email, FILTER_SANITIZE_EMAIL);
    if ($name === '') {
        return '<' . $email . '>';
    }

    return smtpEncodeHeader(str_replace(['<', '>', "\r", "\n"], '', $name)) . ' <' . $email . '>';
}

function sendSmtpTextEmail(
    string $to,
    string $subject,
    string $message,
    string $fromEmail,
    string $fromName,
    string $replyTo = '',
    array $extraHeaders = []
): bool {
    $host = smtpConfigValue('SMTP_HOST', 'mail.xcr.fr');
    $port = (int)smtpConfigValue('SMTP_PORT', '587');
    $user = smtpConfigValue('SMTP_USER', 'tcerda@xcr.fr');
    $pass = smtpConfigValue('SMTP_PASS', '');
    $security = strtolower((string)smtpConfigValue('SMTP_SECURITY', 'starttls'));
    $timeout = (int)smtpConfigValue('EMAIL_TIMEOUT', '30');

    $GLOBALS['SMTP_LAST_ERROR'] = null;
    $GLOBALS['SMTP_LAST_DEBUG'] = [];

    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        $GLOBALS['SMTP_LAST_ERROR'] = 'Invalid recipient address';
        return false;
    }

    if (!$host || !$user || !$pass) {
        $GLOBALS['SMTP_LAST_ERROR'] = 'SMTP_HOST, SMTP_USER or SMTP_PASS is missing';
        return false;
    }

    $remote = ($security === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $context = stream_context_create([
        'ssl' => [
            'peer_name' => $host,
            'verify_peer' => true,
            'verify_peer_name' => true,
            'allow_self_signed' => false,
        ],
    ]);

    $errno = 0;
    $errstr = '';
    $socket = @stream_socket_client($remote, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);

    if (!$socket) {
        $GLOBALS['SMTP_LAST_ERROR'] = "SMTP connection failed: $errstr ($errno)";
        return false;
    }

    stream_set_timeout($socket, $timeout);
    $debug = [];

    try {
        if (!smtpSendCommand($socket, '', [220], $debug)) {
            throw new RuntimeException('SMTP greeting failed');
        }

        $ehloHost = $_SERVER['HTTP_HOST'] ?? gethostname() ?: 'taxiassur.com';
        if (!smtpSendCommand($socket, 'EHLO ' . $ehloHost, [250], $debug)) {
            throw new RuntimeException('SMTP EHLO failed');
        }

        if (in_array($security, ['tls', 'starttls'], true)) {
            if (!smtpSendCommand($socket, 'STARTTLS', [220], $debug)) {
                throw new RuntimeException('SMTP STARTTLS failed');
            }

            if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('TLS negotiation failed');
            }

            if (!smtpSendCommand($socket, 'EHLO ' . $ehloHost, [250], $debug)) {
                throw new RuntimeException('SMTP EHLO after STARTTLS failed');
            }
        }

        if (!smtpSendCommand($socket, 'AUTH LOGIN', [334], $debug)) {
            throw new RuntimeException('SMTP AUTH LOGIN failed');
        }
        if (!smtpSendCommand($socket, base64_encode($user), [334], $debug)) {
            throw new RuntimeException('SMTP username rejected');
        }
        if (!smtpSendCommand($socket, base64_encode($pass), [235], $debug)) {
            throw new RuntimeException('SMTP password rejected');
        }

        $fromEmail = filter_var($fromEmail ?: $user, FILTER_SANITIZE_EMAIL);
        $to = filter_var($to, FILTER_SANITIZE_EMAIL);

        if (!smtpSendCommand($socket, 'MAIL FROM:<' . $fromEmail . '>', [250], $debug)) {
            throw new RuntimeException('SMTP sender rejected');
        }
        if (!smtpSendCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251], $debug)) {
            throw new RuntimeException('SMTP recipient rejected');
        }
        if (!smtpSendCommand($socket, 'DATA', [354], $debug)) {
            throw new RuntimeException('SMTP DATA rejected');
        }

        $headers = [
            'From' => smtpAddress($fromEmail, $fromName),
            'To' => '<' . $to . '>',
            'Subject' => smtpEncodeHeader($subject),
            'Reply-To' => $replyTo ? smtpAddress($replyTo) : smtpAddress($fromEmail),
            'MIME-Version' => '1.0',
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding' => '8bit',
            'Date' => date('r'),
            'Message-ID' => '<' . bin2hex(random_bytes(12)) . '@' . preg_replace('/^www\./', '', $ehloHost) . '>',
        ];

        foreach ($extraHeaders as $name => $value) {
            $name = preg_replace('/[^A-Za-z0-9-]/', '', (string)$name);
            $value = str_replace(["\r", "\n"], '', (string)$value);
            if ($name !== '' && $value !== '') {
                $headers[$name] = $value;
            }
        }

        $rawHeaders = '';
        foreach ($headers as $name => $value) {
            $rawHeaders .= $name . ': ' . $value . "\r\n";
        }

        fwrite($socket, $rawHeaders . "\r\n" . smtpNormalizeMessage($message) . "\r\n.\r\n");
        if (!smtpSendCommand($socket, '', [250], $debug)) {
            throw new RuntimeException('SMTP message rejected');
        }

        smtpSendCommand($socket, 'QUIT', [221], $debug);
        fclose($socket);

        $GLOBALS['SMTP_LAST_DEBUG'] = $debug;
        return true;
    } catch (Throwable $e) {
        $GLOBALS['SMTP_LAST_ERROR'] = $e->getMessage();
        $GLOBALS['SMTP_LAST_DEBUG'] = $debug;
        @fwrite($socket, "QUIT\r\n");
        fclose($socket);
        return false;
    }
}

function getSmtpLastError(): ?string {
    return $GLOBALS['SMTP_LAST_ERROR'] ?? null;
}
?>
