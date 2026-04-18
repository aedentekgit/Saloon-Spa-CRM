
import sys

def count_braces(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    open_braces = content.count('{')
    close_braces = content.count('}')
    open_parens = content.count('(')
    close_parens = content.count(')')
    
    print(f"Braces: {open_braces} open, {close_braces} close")
    print(f"Parens: {open_parens} open, {close_parens} close")

if __name__ == "__main__":
    count_braces(sys.argv[1])
