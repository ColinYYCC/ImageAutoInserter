"""便捷入口点"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from organizer import main

if __name__ == "__main__":
    main()
