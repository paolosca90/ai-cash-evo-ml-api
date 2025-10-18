#!/usr/bin/env python3
"""
Google Cloud Run Cost Calculator for AI Cash Evolution ML Trading System
Calculate and optimize Cloud Run costs based on real usage patterns
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import argparse

class CloudRunCostCalculator:
    """Calculate Cloud Run costs with free tier consideration"""

    # Google Cloud Run pricing (2024 rates)
    PRICING = {
        'vcpu_per_second': 0.0000117,      # $0.0117 per vCPU-hour
        'memory_per_gb_second': 0.0000155,  # $0.0155 per GB-hour
        'request_per_million': 0.40,        # $0.40 per million requests
        'network_egress_per_gb': 0.12,      # $0.12 per GB (North America)
        'storage_per_gb_month': 0.026       # $0.026 per GB-month
    }

    # Free tier limits
    FREE_TIER = {
        'vcpu_seconds': 180000,      # 50 vCPU-hours
        'memory_gb_seconds': 360000, # 100 GB-hours
        'requests': 2000000,         # 2 million requests
        'network_egress_gb': 1       # 1 GB
    }

    def __init__(self):
        self.scenarios = {
            'testing': {
                'requests_per_day': 100,
                'cpu_ms_per_request': 200,
                'memory_mb_per_request': 512,
                'response_kb_per_request': 15,
                'concurrent_users': 1,
                'description': 'Light testing and development'
            },
            'light_trading': {
                'requests_per_day': 1000,
                'cpu_ms_per_request': 300,
                'memory_mb_per_request': 768,
                'response_kb_per_request': 25,
                'concurrent_users': 5,
                'description': 'Small trading bot, limited symbols'
            },
            'medium_trading': {
                'requests_per_day': 10000,
                'cpu_ms_per_request': 400,
                'memory_mb_per_request': 1024,
                'response_kb_per_request': 30,
                'concurrent_users': 20,
                'description': 'Active trading with multiple strategies'
            },
            'heavy_trading': {
                'requests_per_day': 100000,
                'cpu_ms_per_request': 500,
                'memory_mb_per_request': 1536,
                'response_kb_per_request': 40,
                'concurrent_users': 100,
                'description': 'High-frequency trading system'
            },
            'production_system': {
                'requests_per_day': 50000,  # ~26 symbols, 80 requests/hour each
                'cpu_ms_per_request': 450,
                'memory_mb_per_request': 1280,
                'response_kb_per_request': 35,
                'concurrent_users': 50,
                'description': 'Full production system with 26 trading symbols'
            }
        }

    def calculate_monthly_usage(self, scenario: Dict) -> Dict:
        """Calculate monthly usage from daily figures"""
        days_per_month = 30.44  # Average month length

        return {
            'requests_per_month': int(scenario['requests_per_day'] * days_per_month),
            'cpu_seconds_per_month': (scenario['cpu_ms_per_request'] / 1000) * scenario['requests_per_day'] * days_per_month,
            'memory_gb_seconds_per_month': (scenario['memory_mb_per_request'] / 1024) * (scenario['cpu_ms_per_request'] / 1000) * scenario['requests_per_day'] * days_per_month,
            'network_egress_gb_per_month': (scenario['response_kb_per_request'] / 1024 / 1024) * scenario['requests_per_day'] * days_per_month,
            'concurrent_users': scenario['concurrent_users']
        }

    def calculate_costs(self, usage: Dict) -> Dict:
        """Calculate costs with free tier consideration"""

        # Calculate billable usage after free tier
        billable_cpu_seconds = max(0, usage['cpu_seconds_per_month'] - self.FREE_TIER['vcpu_seconds'])
        billable_memory_gb_seconds = max(0, usage['memory_gb_seconds_per_month'] - self.FREE_TIER['memory_gb_seconds'])
        billable_requests = max(0, usage['requests_per_month'] - self.FREE_TIER['requests'])
        billable_network_gb = max(0, usage['network_egress_gb_per_month'] - self.FREE_TIER['network_egress_gb'])

        # Calculate costs
        cpu_cost = billable_cpu_seconds * self.PRICING['vcpu_per_second']
        memory_cost = billable_memory_gb_seconds * self.PRICING['memory_per_gb_second']
        requests_cost = (billable_requests / 1000000) * self.PRICING['request_per_million']
        network_cost = billable_network_gb * self.PRICING['network_egress_per_gb']

        # Add storage cost (assuming 2GB for models and logs)
        storage_cost = 2 * self.PRICING['storage_per_gb_month']

        total_cost = cpu_cost + memory_cost + requests_cost + network_cost + storage_cost

        return {
            'cpu_cost': cpu_cost,
            'memory_cost': memory_cost,
            'requests_cost': requests_cost,
            'network_cost': network_cost,
            'storage_cost': storage_cost,
            'total_cost': total_cost,
            'billable_cpu_seconds': billable_cpu_seconds,
            'billable_memory_gb_seconds': billable_memory_gb_seconds,
            'billable_requests': billable_requests,
            'billable_network_gb': billable_network_gb,
            'free_tier_coverage': {
                'cpu_percent': min(100, (usage['cpu_seconds_per_month'] / self.FREE_TIER['vcpu_seconds']) * 100),
                'memory_percent': min(100, (usage['memory_gb_seconds_per_month'] / self.FREE_TIER['memory_gb_seconds']) * 100),
                'requests_percent': min(100, (usage['requests_per_month'] / self.FREE_TIER['requests']) * 100),
                'network_percent': min(100, (usage['network_egress_gb_per_month'] / self.FREE_TIER['network_egress_gb']) * 100)
            }
        }

    def optimize_recommendations(self, scenario: str, costs: Dict, usage: Dict) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []

        # CPU optimization
        if costs['cpu_cost'] > costs['total_cost'] * 0.4:
            recommendations.append("💡 Consider CPU optimization: Implement request batching to reduce CPU usage by 50-70%")

        # Memory optimization
        if costs['memory_cost'] > costs['total_cost'] * 0.5:
            recommendations.append("💡 Memory optimization: Reduce memory allocation or implement model quantization")

        # Request optimization
        if costs['requests_cost'] > 5:
            recommendations.append("💡 Request optimization: Batch requests together to reduce per-request costs")

        # Free tier optimization
        free_tier = costs['free_tier_coverage']
        if free_tier['cpu_percent'] < 50 and free_tier['memory_percent'] < 50:
            recommendations.append("✅ Great usage! You're well within the free tier limits")

        if free_tier['requests_percent'] > 80:
            recommendations.append("⚠️ Request limit: Consider caching predictions to reduce API calls")

        if free_tier['network_percent'] > 80:
            recommendations.append("⚠️ Network limit: Optimize response sizes or implement compression")

        # Scaling recommendations
        if usage['concurrent_users'] > 50:
            recommendations.append("📈 Scaling: Consider increasing max instances for better performance")

        # Model optimization
        if scenario in ['heavy_trading', 'production_system']:
            recommendations.append("🤖 ML Optimization: Use TensorFlow Lite or ONNX for faster inference")

        # Cost-effective alternatives
        if costs['total_cost'] > 100:
            recommendations.append("💰 Cost optimization: Consider implementing a hybrid approach with local predictions for high-frequency signals")

        return recommendations

    def generate_scenario_report(self, scenario_name: str) -> Dict:
        """Generate comprehensive report for a scenario"""
        scenario = self.scenarios[scenario_name]
        usage = self.calculate_monthly_usage(scenario)
        costs = self.calculate_costs(usage)
        recommendations = self.optimize_recommendations(scenario_name, costs, usage)

        return {
            'scenario': scenario_name,
            'description': scenario['description'],
            'configuration': scenario,
            'usage': usage,
            'costs': costs,
            'recommendations': recommendations,
            'performance_metrics': {
                'avg_response_time_ms': scenario['cpu_ms_per_request'],
                'memory_per_request_mb': scenario['memory_mb_per_request'],
                'estimated_qps': usage['requests_per_month'] / (30.44 * 24 * 3600),
                'peak_concurrent_users': scenario['concurrent_users']
            }
        }

    def compare_all_scenarios(self) -> Dict:
        """Compare all scenarios side by side"""
        comparison = {}

        for scenario_name in self.scenarios:
            comparison[scenario_name] = self.generate_scenario_report(scenario_name)

        # Add comparison summary
        costs_summary = {name: data['costs']['total_cost'] for name, data in comparison.items()}
        cheapest_scenario = min(costs_summary, key=costs_summary.get)
        most_expensive = max(costs_summary, key=costs_summary.get)

        comparison['summary'] = {
            'cheapest_scenario': cheapest_scenario,
            'most_expensive_scenario': most_expensive,
            'cost_range': {
                'min': costs_summary[cheapest_scenario],
                'max': costs_summary[most_expensive]
            },
            'average_cost': sum(costs_summary.values()) / len(costs_summary)
        }

        return comparison

    def calculate_break_even(self, requests_per_day: int) -> Dict:
        """Calculate break-even analysis for different request volumes"""
        base_scenario = self.scenarios['medium_trading'].copy()
        base_scenario['requests_per_day'] = requests_per_day

        usage = self.calculate_monthly_usage(base_scenario)
        costs = self.calculate_costs(usage)

        # Calculate cost per request
        cost_per_request = costs['total_cost'] / usage['requests_per_month']

        # Free tier utilization
        free_tier_utilization = {
            'cpu': (usage['cpu_seconds_per_month'] / self.FREE_TIER['vcpu_seconds']) * 100,
            'memory': (usage['memory_gb_seconds_per_month'] / self.FREE_TIER['memory_gb_seconds']) * 100,
            'requests': (usage['requests_per_month'] / self.FREE_TIER['requests']) * 100
        }

        return {
            'requests_per_day': requests_per_day,
            'requests_per_month': usage['requests_per_month'],
            'monthly_cost': costs['total_cost'],
            'cost_per_request': cost_per_request,
            'free_tier_utilization': free_tier_utilization,
            'within_free_tier': costs['total_cost'] < 1.0,  # Less than $1 is effectively free
            'cost_breakdown': costs
        }

    def print_report(self, report: Dict):
        """Print formatted report"""
        print(f"\n{'='*60}")
        print(f"📊 SCENARIO: {report['scenario'].upper()}")
        print(f"{'='*60}")
        print(f"📝 Description: {report['description']}")
        print(f"\n📈 USAGE:")
        print(f"   Requests: {report['usage']['requests_per_month']:,}/month ({report['usage']['requests_per_month']/30.44:,.0f}/day)")
        print(f"   CPU Time: {report['usage']['cpu_seconds_per_month']:,.0f} seconds")
        print(f"   Memory: {report['usage']['memory_gb_seconds_per_month']:,.0f} GB-seconds")
        print(f"   Network: {report['usage']['network_egress_gb_per_month']:.2f} GB")

        print(f"\n💰 COSTS:")
        print(f"   CPU: ${report['costs']['cpu_cost']:.2f}")
        print(f"   Memory: ${report['costs']['memory_cost']:.2f}")
        print(f"   Requests: ${report['costs']['requests_cost']:.2f}")
        print(f"   Network: ${report['costs']['network_cost']:.2f}")
        print(f"   Storage: ${report['costs']['storage_cost']:.2f}")
        print(f"   {'─'*40}")
        print(f"   TOTAL: ${report['costs']['total_cost']:.2f}/month")

        print(f"\n🎯 PERFORMANCE:")
        print(f"   Avg Response Time: {report['performance_metrics']['avg_response_time_ms']}ms")
        print(f"   Memory/Request: {report['performance_metrics']['memory_per_request_mb']}MB")
        print(f"   Estimated QPS: {report['performance_metrics']['estimated_qps']:.2f}")
        print(f"   Peak Concurrent Users: {report['performance_metrics']['peak_concurrent_users']}")

        print(f"\n📊 FREE TIER USAGE:")
        ft = report['costs']['free_tier_coverage']
        print(f"   CPU: {ft['cpu_percent']:.1f}%")
        print(f"   Memory: {ft['memory_percent']:.1f}%")
        print(f"   Requests: {ft['requests_percent']:.1f}%")
        print(f"   Network: {ft['network_percent']:.1f}%")

        if report['recommendations']:
            print(f"\n💡 RECOMMENDATIONS:")
            for rec in report['recommendations']:
                print(f"   {rec}")

def main():
    parser = argparse.ArgumentParser(description='Google Cloud Run Cost Calculator')
    parser.add_argument('--scenario', choices=['testing', 'light_trading', 'medium_trading', 'heavy_trading', 'production_system'],
                       help='Calculate cost for specific scenario')
    parser.add_argument('--compare', action='store_true', help='Compare all scenarios')
    parser.add_argument('--requests', type=int, help='Custom requests per day for analysis')
    parser.add_argument('--breakeven', type=int, help='Find break-even point for given daily requests')
    parser.add_argument('--json', action='store_true', help='Output JSON format')

    args = parser.parse_args()
    calculator = CloudRunCostCalculator()

    if args.compare:
        comparison = calculator.compare_all_scenarios()
        if args.json:
            print(json.dumps(comparison, indent=2))
        else:
            print(f"\n🏆 CLOUD RUN COST COMPARISON")
            print(f"{'='*60}")

            for scenario_name, report in comparison.items():
                if scenario_name == 'summary':
                    continue
                print(f"\n{scenario_name.upper()}: ${report['costs']['total_cost']:.2f}/month")
                print(f"  {report['description']}")

            summary = comparison['summary']
            print(f"\n📊 SUMMARY:")
            print(f"  Cheapest: {summary['cheapest_scenario']} (${summary['cost_range']['min']:.2f})")
            print(f"  Most Expensive: {summary['most_expensive_scenario']} (${summary['cost_range']['max']:.2f})")
            print(f"  Average Cost: ${summary['average_cost']:.2f}")

    elif args.scenario:
        report = calculator.generate_scenario_report(args.scenario)
        if args.json:
            print(json.dumps(report, indent=2))
        else:
            calculator.print_report(report)

    elif args.requests:
        analysis = calculator.calculate_break_even(args.requests)
        if args.json:
            print(json.dumps(analysis, indent=2))
        else:
            print(f"\n💰 COST ANALYSIS: {args.requests:,} requests/day")
            print(f"{'='*60}")
            print(f"   Monthly Requests: {analysis['requests_per_month']:,}")
            print(f"   Monthly Cost: ${analysis['monthly_cost']:.2f}")
            print(f"   Cost per Request: ${analysis['cost_per_request']:.6f}")
            print(f"   Within Free Tier: {'✅ Yes' if analysis['within_free_tier'] else '❌ No'}")

            print(f"\n📊 Free Tier Utilization:")
            ft = analysis['free_tier_utilization']
            print(f"   CPU: {ft['cpu_percent']:.1f}%")
            print(f"   Memory: {ft['memory_percent']:.1f}%")
            print(f"   Requests: {ft['requests_percent']:.1f}%")

    elif args.breakeven:
        # Find break-even point
        print(f"\n🎯 BREAK-EVEN ANALYSIS")
        print(f"{'='*60}")

        test_requests = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000]
        for req in test_requests:
            analysis = calculator.calculate_break_even(req)
            status = "✅ FREE" if analysis['within_free_tier'] else f"💰 ${analysis['monthly_cost']:.2f}"
            print(f"   {req:5,} req/day: {status}")

    else:
        # Default: show all scenarios
        for scenario_name in calculator.scenarios:
            report = calculator.generate_scenario_report(scenario_name)
            calculator.print_report(report)

if __name__ == "__main__":
    main()