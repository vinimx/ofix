"""
Conversor de extrato bancario PDF para OFX.

Uso:
    python3 convert.py <caminho_do_pdf>

Saida:
    Em caso de sucesso, imprime o caminho do arquivo OFX gerado no stdout e encerra com codigo 0.
    Em caso de erro, imprime a descricao no stderr e encerra com codigo 1.

Dependencias:
    pdfplumber>=0.10.0
"""

import sys
import os
import re
import hashlib
from datetime import datetime

try:
    import pdfplumber
except ImportError:
    print("Dependencia ausente: pdfplumber. Execute: pip install pdfplumber", file=sys.stderr)
    sys.exit(1)


# Limite de paginas para evitar PDF bomb (arquivos construidos para consumir recursos)
MAX_PAGES = 200


def sanitize_text(value: str) -> str:
    """Remove caracteres de controle e escapa caracteres especiais para OFX."""
    return re.sub(r'[\x00-\x1f\x7f]', '', value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def parse_transactions(pdf_path: str) -> list[dict]:
    """
    Extrai transacoes do PDF.

    Estrategia basica: busca linhas que contenham data no formato DD/MM/AAAA,
    um descritivo e um valor numerico (com virgula como separador decimal).

    Retorna lista de dicts com: date (YYYYMMDD), description, amount (float).
    """
    transactions = []
    # Padrao: DD/MM/AAAA seguido de texto e valor (ex: -1.234,56 ou 1.234,56)
    pattern = re.compile(
        r'(\d{2}/\d{2}/\d{4})\s+(.+?)\s+([-+]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$'
    )

    with pdfplumber.open(pdf_path) as pdf:
        if len(pdf.pages) > MAX_PAGES:
            print(
                f"PDF excede o limite de {MAX_PAGES} paginas ({len(pdf.pages)} encontradas).",
                file=sys.stderr
            )
            sys.exit(1)

        for page in pdf.pages:
            text = page.extract_text() or ''
            for line in text.splitlines():
                match = pattern.search(line.strip())
                if not match:
                    continue
                raw_date, description, raw_amount = match.groups()
                # Converte DD/MM/AAAA -> YYYYMMDD
                try:
                    date_obj = datetime.strptime(raw_date, '%d/%m/%Y')
                    date_str = date_obj.strftime('%Y%m%d')
                except ValueError:
                    continue
                # Converte valor: remove pontos de milhar, substitui virgula por ponto
                amount_str = raw_amount.replace('.', '').replace(',', '.')
                try:
                    amount = float(amount_str)
                except ValueError:
                    continue
                transactions.append({
                    'date': date_str,
                    'description': sanitize_text(description.strip()),
                    'amount': amount,
                })

    return transactions


def generate_fitid(date: str, description: str, amount: float, index: int) -> str:
    """Gera um FITID unico e determinista por transacao."""
    raw = f"{date}{description}{amount}{index}"
    return hashlib.sha1(raw.encode()).hexdigest()[:16].upper()


def build_ofx(transactions: list[dict], account_id: str = 'CONTA001') -> str:
    """Gera o conteudo OFX (SGML) a partir das transacoes extraidas."""
    now = datetime.utcnow().strftime('%Y%m%d%H%M%S')

    if transactions:
        dates = [t['date'] for t in transactions]
        dtstart = min(dates)
        dtend = max(dates)
    else:
        dtstart = dtend = now[:8]

    stmttrn_lines = []
    for i, t in enumerate(transactions):
        trntype = 'CREDIT' if t['amount'] >= 0 else 'DEBIT'
        fitid = generate_fitid(t['date'], t['description'], t['amount'], i)
        stmttrn_lines.append(f"""<STMTTRN>
<TRNTYPE>{trntype}</TRNTYPE>
<DTPOSTED>{t['date']}</DTPOSTED>
<TRNAMT>{t['amount']:.2f}</TRNAMT>
<FITID>{fitid}</FITID>
<MEMO>{t['description']}</MEMO>
</STMTTRN>""")

    transactions_block = '\n'.join(stmttrn_lines)

    return f"""OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<DTSERVER>{now}</DTSERVER>
<LANGUAGE>POR</LANGUAGE>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1</TRNUID>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<STMTRS>
<CURDEF>BRL</CURDEF>
<BANKACCTFROM>
<BANKID>0000</BANKID>
<ACCTID>{account_id}</ACCTID>
<ACCTTYPE>CHECKING</ACCTTYPE>
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>{dtstart}</DTSTART>
<DTEND>{dtend}</DTEND>
{transactions_block}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
"""


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 convert.py <caminho_do_pdf>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]

    if not os.path.isfile(pdf_path):
        print(f"Arquivo nao encontrado: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    if not pdf_path.lower().endswith('.pdf'):
        print("O arquivo informado nao possui extensao .pdf", file=sys.stderr)
        sys.exit(1)

    transactions = parse_transactions(pdf_path)

    if not transactions:
        print(
            "Nenhuma transacao encontrada no PDF. Verifique se o layout do extrato e suportado.",
            file=sys.stderr
        )
        sys.exit(1)

    ofx_content = build_ofx(transactions)

    ofx_path = os.path.splitext(pdf_path)[0] + '.ofx'
    with open(ofx_path, 'w', encoding='ascii', errors='replace') as f:
        f.write(ofx_content)

    # Imprime caminho do OFX no stdout para o worker capturar
    print(ofx_path)
    sys.exit(0)


if __name__ == '__main__':
    main()
