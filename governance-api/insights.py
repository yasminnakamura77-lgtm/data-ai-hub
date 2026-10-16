"""Explainable, source-grounded diagnostics for the demo governance catalogue.

No fabricated probabilities or incident histories. These are rule-based signals,
not model predictions, and must be labelled demo until real metadata is connected.
"""
from __future__ import annotations

from typing import Any

import catalogue


def analyse() -> dict[str, Any]:
    sources = [catalogue.get_source(s['id']) for s in catalogue.list_sources()]
    sources = [s for s in sources if s]
    findings: list[dict[str, Any]] = []
    for source in sources:
        code = source['code']
        quality = source.get('dataQuality') or {}
        governance = source.get('governance') or {}
        ownership = source.get('ownership') or {}
        scores = quality.get('metrics') or []
        for metric in scores:
            value = metric.get('value')
            if isinstance(value, (int, float)) and value < 90:
                findings.append({
                    'id': f"{source['id']}-quality-{metric['label']}",
                    'kind': 'quality', 'severity': 'high' if value < 70 else 'medium',
                    'title': f"{metric['label']} needs attention",
                    'description': f"{code}: {metric['label']} is {value}%, below the 90% review threshold.",
                    'evidence': f"Data Catalogue · {code} · Data quality",
                    'recommendation': 'Review the underlying quality checks and affected records before changing production data.',
                    'sourceId': source['id'],
                })
        warnings = quality.get('warnings')
        if isinstance(warnings, int) and warnings > 0:
            findings.append({
                'id': f"{source['id']}-warnings", 'kind': 'quality', 'severity': 'medium',
                'title': 'Quality checks require review',
                'description': f"{code} reports {warnings} quality warning(s). The catalogue does not contain their underlying causes.",
                'evidence': f"Data Catalogue · {code} · Warnings",
                'recommendation': 'Inspect the quality-check logs and determine whether records are impacted.',
                'sourceId': source['id'],
            })
        complete, total = governance.get('controlsComplete'), governance.get('controlsTotal')
        if isinstance(complete, int) and isinstance(total, int) and total > 0 and complete < total:
            findings.append({
                'id': f"{source['id']}-controls", 'kind': 'governance', 'severity': 'medium',
                'title': 'Governance controls incomplete',
                'description': f"{code} has {complete} of {total} governance controls marked complete.",
                'evidence': f"Data Catalogue · {code} · Governance",
                'recommendation': 'Confirm outstanding control owners and document closure evidence.',
                'sourceId': source['id'],
            })
        issues = ownership.get('openIssues')
        if isinstance(issues, int) and issues > 0:
            findings.append({
                'id': f"{source['id']}-issues", 'kind': 'operations', 'severity': 'medium',
                'title': 'Open issues recorded',
                'description': f"{code} lists {issues} open issue(s); detail and severity are not available in the catalogue.",
                'evidence': f"Data Catalogue · {code} · Ownership",
                'recommendation': 'Review the issue register with the technical owner.',
                'sourceId': source['id'],
            })
        for similar in source.get('similarData') or []:
            findings.append({
                'id': f"{source['id']}-similar-{len(findings)}", 'kind': 'opportunity', 'severity': 'info',
                'title': 'Review potentially related datasets',
                'description': f"{code} lists {similar.get('name', 'another dataset')} as {similar.get('similarity', 'related')}. This is not proof of duplicated records.",
                'evidence': f"Data Catalogue · {code} · Similar data",
                'recommendation': 'Compare schemas, ownership and sample records before considering consolidation.',
                'sourceId': source['id'],
            })
    order = {'high': 0, 'medium': 1, 'info': 2}
    findings.sort(key=lambda f: (order[f['severity']], f['title'], f['sourceId']))
    return {'mode': 'demo', 'method': 'rule-based', 'sourcesAnalysed': len(sources), 'findings': findings,
            'note': 'Insights are calculated from sample catalogue metadata, not from live datasets or historical AI incidents. Review thresholds are illustrative.'}
